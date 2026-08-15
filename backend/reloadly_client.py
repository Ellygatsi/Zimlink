import os
import uuid
import logging
from typing import Optional, Any

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("zimlink.reloadly")


RELOADLY_CLIENT_ID = os.environ.get(
    "RELOADLY_CLIENT_ID",
    "",
).strip()

RELOADLY_CLIENT_SECRET = os.environ.get(
    "RELOADLY_CLIENT_SECRET",
    "",
).strip()

RELOADLY_AIRTIME_BASE_URL = os.environ.get(
    "RELOADLY_AIRTIME_BASE_URL",
    "https://topups-sandbox.reloadly.com",
).strip().rstrip("/")

RELOADLY_UTILITY_BASE_URL = os.environ.get(
    "RELOADLY_UTILITY_BASE_URL",
    "https://utilities-sandbox.reloadly.com",
).strip().rstrip("/")

RELOADLY_AUTH_URL = "https://auth.reloadly.com/oauth/token"


class ReloadlyError(Exception):
    """Raised when Reloadly returns an error."""

    def __init__(
        self,
        message: str,
        status_code: int = 502,
        details: Optional[dict] = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class ReloadlyClient:
    def __init__(self):
        self._airtime_token: Optional[str] = None
        self._utility_token: Optional[str] = None

    # ============================================================
    # Configuration
    # ============================================================

    def is_configured(self) -> bool:
        return bool(
            RELOADLY_CLIENT_ID
            and RELOADLY_CLIENT_SECRET
        )

    def _require_configured(self):
        if not self.is_configured():
            raise ReloadlyError(
                "Reloadly is not configured. "
                "Add RELOADLY_CLIENT_ID and "
                "RELOADLY_CLIENT_SECRET to the backend environment.",
                status_code=500,
            )

    # ============================================================
    # Authentication
    # ============================================================

    async def _get_token(self, service: str) -> str:
        self._require_configured()

        if service == "airtime":
            if self._airtime_token:
                return self._airtime_token

            audience = RELOADLY_AIRTIME_BASE_URL

        elif service == "utility":
            if self._utility_token:
                return self._utility_token

            audience = RELOADLY_UTILITY_BASE_URL

        else:
            raise ReloadlyError(
                "Invalid Reloadly service.",
                status_code=500,
            )

        payload = {
            "client_id": RELOADLY_CLIENT_ID,
            "client_secret": RELOADLY_CLIENT_SECRET,
            "grant_type": "client_credentials",
            "audience": audience,
        }

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    RELOADLY_AUTH_URL,
                    headers=headers,
                    json=payload,
                )
        except httpx.RequestError as exc:
            logger.exception(
                "Reloadly authentication request failed."
            )

            raise ReloadlyError(
                f"Unable to connect to Reloadly authentication service: {exc}",
                status_code=502,
            )

        try:
            body = response.json()
        except Exception:
            body = {
                "message": response.text[:500],
            }

        if response.status_code >= 400:
            logger.error(
                "Reloadly authentication failed: %s",
                body,
            )

            raise ReloadlyError(
                body.get(
                    "message",
                    "Reloadly authentication failed.",
                ),
                status_code=502,
                details=body,
            )

        token = body.get("access_token")

        if not token:
            raise ReloadlyError(
                "Reloadly did not return an access token.",
                status_code=502,
                details=body,
            )

        if service == "airtime":
            self._airtime_token = token
        else:
            self._utility_token = token

        return token

    # ============================================================
    # Generic HTTP request
    # ============================================================

    async def _request(
        self,
        service: str,
        method: str,
        path: str,
        *,
        json_body: Optional[dict] = None,
        params: Optional[dict] = None,
        retry_on_401: bool = True,
    ) -> Any:

        token = await self._get_token(service)

        if service == "airtime":
            base_url = RELOADLY_AIRTIME_BASE_URL

            accept_header = (
                "application/com.reloadly.topups-v1+json"
            )

        elif service == "utility":
            base_url = RELOADLY_UTILITY_BASE_URL

            accept_header = (
                "application/com.reloadly.utilities-v1+json"
            )

        else:
            raise ReloadlyError(
                "Invalid Reloadly service.",
                status_code=500,
            )

        url = f"{base_url}/{path.lstrip('/')}"

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": accept_header,
        }

        logger.debug(
            "Reloadly %s %s params=%s",
            method,
            url,
            params,
        )

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.request(
                    method,
                    url,
                    headers=headers,
                    json=json_body,
                    params=params,
                )
        except httpx.RequestError as exc:
            logger.exception(
                "Reloadly request failed: %s %s",
                method,
                url,
            )

            raise ReloadlyError(
                f"Unable to connect to Reloadly: {exc}",
                status_code=502,
            )

        # --------------------------------------------------------
        # Access token expired
        # --------------------------------------------------------

        if response.status_code == 401 and retry_on_401:

            if service == "airtime":
                self._airtime_token = None
            else:
                self._utility_token = None

            return await self._request(
                service,
                method,
                path,
                json_body=json_body,
                params=params,
                retry_on_401=False,
            )

        # --------------------------------------------------------
        # Parse response
        # --------------------------------------------------------

        try:
            body = response.json()
        except Exception:
            body = {
                "message": response.text[:1000],
            }

        # --------------------------------------------------------
        # Error response
        # --------------------------------------------------------

        if response.status_code >= 400:

            logger.error(
                "Reloadly %s %s failed: %s",
                method,
                url,
                body,
            )

            message = None

            if isinstance(body, dict):
                message = body.get("message")

                if not message:
                    message = body.get("errorCode")

                if not message:
                    message = body.get("error")

            raise ReloadlyError(
                message or "Reloadly request failed.",
                status_code=502,
                details=body if isinstance(body, dict) else {},
            )

        return body

    # ============================================================
    # Airtime / Topups
    # ============================================================

    async def get_operators(
        self,
        country_code: str = "ZW",
    ):
        """
        Get Reloadly operators for a country.

        includeBundles=true is important because Reloadly can return
        bundle/product information as part of the operator response.
        """

        return await self._request(
            "airtime",
            "GET",
            f"/operators/countries/{country_code}",
            params={
                "includeBundles": "true",
            },
        )

    async def get_operator(
        self,
        operator_id: int,
    ):
        return await self._request(
            "airtime",
            "GET",
            f"/operators/{int(operator_id)}",
        )

    async def get_operator_by_country(
        self,
        country_code: str = "ZW",
    ):
        """
        Retrieve operators for a country.

        This intentionally uses the country in the URL path and requests
        bundle information from Reloadly.
        """

        return await self._request(
            "airtime",
            "GET",
            f"/operators/countries/{country_code}",
            params={
                "includeBundles": "true",
            },
        )

    async def get_bundles(
        self,
        operator_id: int,
        country_code: str = "ZW",
    ):
        """
        Get bundles/products for an operator.

        IMPORTANT:
        Reloadly's /operators/{id}/fixed-value endpoint is not reliable
        for all operators and returns 404 for Econet in the current
        sandbox environment.

        Instead, retrieve the country's operators with includeBundles=true
        and extract the requested operator's bundle information.
        """

        operator_id = int(operator_id)

        data = await self.get_operators(
            country_code=country_code,
        )

        # --------------------------------------------------------
        # Reloadly may return:
        #
        # [
        #   {...},
        #   {...}
        # ]
        #
        # or:
        #
        # {
        #   "content": [...]
        # }
        #
        # Handle both.
        # --------------------------------------------------------

        if isinstance(data, list):
            operators = data

        elif isinstance(data, dict):
            operators = (
                data.get("content")
                or data.get("operators")
                or data.get("data")
                or []
            )

        else:
            operators = []

        if not isinstance(operators, list):
            operators = []

        # --------------------------------------------------------
        # Find requested operator
        # --------------------------------------------------------

        operator = None

        for item in operators:
            if not isinstance(item, dict):
                continue

            item_id = (
                item.get("id")
                or item.get("operatorId")
            )

            try:
                if item_id is not None and int(item_id) == operator_id:
                    operator = item
                    break
            except (TypeError, ValueError):
                continue

        if operator is None:
            raise ReloadlyError(
                f"Reloadly operator {operator_id} was not found "
                f"for country {country_code}.",
                status_code=404,
                details={
                    "operatorId": operator_id,
                    "countryCode": country_code,
                },
            )

        # --------------------------------------------------------
        # Extract bundle information
        # --------------------------------------------------------

        possible_bundle_keys = (
            "bundles",
            "bundle",
            "products",
            "fixedValue",
            "fixedValues",
            "package",
            "packages",
        )

        bundles = None

        for key in possible_bundle_keys:
            value = operator.get(key)

            if isinstance(value, list):
                bundles = value
                break

            if isinstance(value, dict):
                bundles = (
                    value.get("content")
                    or value.get("data")
                    or value.get("items")
                )

                if isinstance(bundles, list):
                    break

        # --------------------------------------------------------
        # Some Reloadly responses put bundle information directly
        # under the operator's products structure.
        # --------------------------------------------------------

        if bundles is None:
            bundles = []

        # --------------------------------------------------------
        # Return a predictable structure to server.py/frontend.
        #
        # We preserve the original operator information so the API
        # can expose useful metadata without another Reloadly call.
        # --------------------------------------------------------

        return {
            "operator": operator,
            "operatorId": operator_id,
            "countryCode": country_code,
            "bundles": bundles,
        }

    async def topup(
        self,
        *,
        operator_id: int,
        phone: str,
        amount: float,
        country_code: str = "ZW",
        custom_identifier: Optional[str] = None,
    ):
        reference = custom_identifier or str(uuid.uuid4())

        payload = {
            "operatorId": int(operator_id),
            "amount": float(amount),
            "useLocalAmount": False,
            "customIdentifier": reference,
            "recipientPhone": {
                "countryCode": country_code,
                "number": phone,
            },
        }

        return await self._request(
            "airtime",
            "POST",
            "/topups",
            json_body=payload,
        )

    async def bundle_topup(
        self,
        *,
        operator_id: int,
        bundle_id: int,
        phone: str,
        country_code: str = "ZW",
        custom_identifier: Optional[str] = None,
    ):
        reference = custom_identifier or str(uuid.uuid4())

        payload = {
            "operatorId": int(operator_id),
            "productId": int(bundle_id),
            "useLocalAmount": False,
            "customIdentifier": reference,
            "recipientPhone": {
                "countryCode": country_code,
                "number": phone,
            },
        }

        return await self._request(
            "airtime",
            "POST",
            "/topups",
            json_body=payload,
        )

    # ============================================================
    # Utility / Bill Payments
    # ============================================================

    async def get_billers(
        self,
        country_code: str = "ZW",
    ):
        """
        Get billers available in a country.
        """

        return await self._request(
            "utility",
            "GET",
            "/billers",
            params={
                "countryCode": country_code,
            },
        )

    async def get_biller(
        self,
        biller_id: int,
    ):
        return await self._request(
            "utility",
            "GET",
            f"/billers/{int(biller_id)}",
        )

    async def pay_bill(
        self,
        *,
        biller_id: int,
        subscriber_account_number: str,
        amount: float,
        country_code: str = "ZW",
        custom_identifier: Optional[str] = None,
        additional_info: Optional[dict] = None,
    ):
        reference = custom_identifier or str(uuid.uuid4())

        payload = {
            "billerId": int(biller_id),
            "subscriberAccountNumber": str(
                subscriber_account_number
            ),
            "amount": float(amount),
            "useLocalAmount": False,
            "referenceId": reference,
        }

        if country_code:
            payload["countryCode"] = country_code

        if additional_info:
            payload["additionalInfo"] = additional_info

        return await self._request(
            "utility",
            "POST",
            "/payments",
            json_body=payload,
        )

    async def get_utility_transaction(
        self,
        transaction_id: str,
    ):
        return await self._request(
            "utility",
            "GET",
            f"/transactions/{transaction_id}",
        )


reloadly = ReloadlyClient()