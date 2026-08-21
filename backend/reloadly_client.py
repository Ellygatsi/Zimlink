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

# ------------------------------------------------------------------
# Environment safety
# ------------------------------------------------------------------
# Set ENVIRONMENT=production (or APP_ENV=production) in your prod
# deployment. If that's set but the Reloadly base URLs are still
# pointing at the sandbox hosts (either because RELOADLY_AIRTIME_BASE_URL
# / RELOADLY_UTILITY_BASE_URL were never overridden, or were overridden
# to something that still contains "sandbox"), we refuse to start
# rather than silently sending "production" traffic to the sandbox.
APP_ENVIRONMENT = (
    os.environ.get("ENVIRONMENT")
    or os.environ.get("APP_ENV")
    or ""
).strip().lower()


def _looks_like_sandbox_url(url: str) -> bool:
    return "sandbox" in url.lower()


def _assert_environment_matches_urls() -> None:
    if APP_ENVIRONMENT != "production":
        return

    sandbox_urls = [
        name
        for name, url in (
            ("RELOADLY_AIRTIME_BASE_URL", RELOADLY_AIRTIME_BASE_URL),
            ("RELOADLY_UTILITY_BASE_URL", RELOADLY_UTILITY_BASE_URL),
        )
        if _looks_like_sandbox_url(url)
    ]

    if sandbox_urls:
        raise RuntimeError(
            "Refusing to start: ENVIRONMENT is set to 'production' but "
            f"{', '.join(sandbox_urls)} still point at Reloadly sandbox "
            "host(s). Set the production Reloadly base URLs explicitly "
            "(e.g. https://topups.reloadly.com and "
            "https://utilities.reloadly.com) before deploying, or unset "
            "ENVIRONMENT if this really is meant to run against sandbox."
        )


_assert_environment_matches_urls()


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

        if _looks_like_sandbox_url(RELOADLY_AIRTIME_BASE_URL) or _looks_like_sandbox_url(
            RELOADLY_UTILITY_BASE_URL
        ):
            logger.warning(
                "Reloadly client is configured against SANDBOX host(s): "
                "airtime=%s utility=%s. Transactions will NOT be real.",
                RELOADLY_AIRTIME_BASE_URL,
                RELOADLY_UTILITY_BASE_URL,
            )
        else:
            logger.info(
                "Reloadly client is configured against: airtime=%s utility=%s",
                RELOADLY_AIRTIME_BASE_URL,
                RELOADLY_UTILITY_BASE_URL,
            )

    # ============================================================
    # Configuration
    # ============================================================

    def is_configured(self) -> bool:
        return bool(
            RELOADLY_CLIENT_ID
            and RELOADLY_CLIENT_SECRET
        )

    def is_sandbox(self) -> bool:
        """True if either Reloadly service is pointed at a sandbox host."""
        return _looks_like_sandbox_url(
            RELOADLY_AIRTIME_BASE_URL
        ) or _looks_like_sandbox_url(RELOADLY_UTILITY_BASE_URL)

    def _require_configured(self):
        if not self.is_configured():
            raise ReloadlyError(
                "Reloadly is not configured. "
                "Add RELOADLY_CLIENT_ID and "
                "RELOADLY_CLIENT_SECRET to the backend environment.",
                status_code=500,
            )

    # ============================================================
    # Phone Number Helpers
    # ============================================================

    def _normalize_phone(
        self,
        phone: str,
        country_code: str = "ZW",
    ) -> str:
        """
        Normalize a phone number into the international format
        expected by Reloadly.

        Examples for Zimbabwe:

            0712345678
            +263712345678
            263712345678

        all become:

            263712345678
        """

        if not phone:
            raise ReloadlyError(
                "A recipient phone number is required.",
                status_code=400,
            )

        digits = "".join(
            character
            for character in str(phone)
            if character.isdigit()
        )

        if not digits:
            raise ReloadlyError(
                "The recipient phone number is invalid.",
                status_code=400,
            )

        country_code = (
            str(country_code or "ZW")
            .strip()
            .upper()
        )

        # Zimbabwe
        if country_code == "ZW":

            # Already international
            if digits.startswith("263"):
                normalized = digits

            # Local Zimbabwe format
            elif digits.startswith("0"):
                normalized = "263" + digits[1:]

            # Assume the number was supplied without leading zero
            elif digits.startswith("7") or digits.startswith("8"):
                normalized = "263" + digits

            else:
                normalized = digits

        else:
            # For other countries, preserve the supplied digits.
            normalized = digits

        logger.debug(
            "Normalized phone for Reloadly: country=%s phone=%s",
            country_code,
            normalized,
        )

        return normalized

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
    # Generic HTTP Request
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
        # Token expired
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
        # Reloadly error
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
                details=(
                    body
                    if isinstance(body, dict)
                    else {}
                ),
            )

        return body

    # ============================================================
    # OPERATOR DETECTION
    # ============================================================

    async def detect_operator(
        self,
        *,
        phone: str,
        country_code: str = "ZW",
    ):
        """
        Automatically detect the mobile operator belonging to
        a phone number using Reloadly.

        Reloadly endpoint:

        GET /operators/auto-detect/phone/{phone}/countries/{country}

        This MUST happen before a top-up is submitted.
        """

        normalized_phone = self._normalize_phone(
            phone,
            country_code,
        )

        country_code = (
            str(country_code or "ZW")
            .strip()
            .upper()
        )

        try:
            result = await self._request(
                "airtime",
                "GET",
                (
                    "/operators/auto-detect/phone/"
                    f"{normalized_phone}/countries/"
                    f"{country_code}"
                ),
                params={
                    "suggestedAmountsMap": "false",
                    "suggestedAmounts": "false",
                },
            )

        except ReloadlyError as exc:

            logger.error(
                "Could not auto-detect operator for phone %s: %s",
                normalized_phone,
                exc.message,
            )

            raise ReloadlyError(
                "We could not verify the mobile network for this "
                "phone number. Please check the number and try again.",
                status_code=400,
                details={
                    "code": "OPERATOR_DETECTION_FAILED",
                    "reloadly": exc.details,
                },
            )

        if not isinstance(result, dict):

            raise ReloadlyError(
                "Reloadly returned an invalid operator response.",
                status_code=502,
            )

        detected_operator_id = (
            result.get("operatorId")
            or result.get("id")
        )

        if detected_operator_id is None:

            raise ReloadlyError(
                "Reloadly could not determine the operator for "
                "this phone number.",
                status_code=400,
                details={
                    "code": "OPERATOR_NOT_DETECTED",
                    "response": result,
                },
            )

        try:
            detected_operator_id = int(
                detected_operator_id
            )

        except (TypeError, ValueError):

            raise ReloadlyError(
                "Reloadly returned an invalid operator ID.",
                status_code=502,
                details={
                    "response": result,
                },
            )

        detected_name = (
            result.get("name")
            or result.get("operatorName")
            or "Unknown operator"
        )

        logger.info(
            "Reloadly detected operator: phone=%s operator_id=%s name=%s",
            normalized_phone,
            detected_operator_id,
            detected_name,
        )

        return {
            "operatorId": detected_operator_id,
            "operatorName": detected_name,
            "phone": normalized_phone,
            "countryCode": country_code,
            "raw": result,
        }

    # ============================================================
    # VERIFY SELECTED OPERATOR
    # ============================================================

    async def verify_operator(
        self,
        *,
        operator_id: int,
        phone: str,
        country_code: str = "ZW",
    ):
        """
        Verify that the phone number belongs to the operator selected
        by the user.

        This is the security gate before every top-up.
        """

        selected_operator_id = int(operator_id)

        detected = await self.detect_operator(
            phone=phone,
            country_code=country_code,
        )

        detected_operator_id = int(
            detected["operatorId"]
        )

        if detected_operator_id != selected_operator_id:

            detected_name = detected.get(
                "operatorName",
                "another mobile network",
            )

            logger.warning(
                "OPERATOR MISMATCH: selected=%s detected=%s "
                "phone=%s",
                selected_operator_id,
                detected_operator_id,
                detected["phone"],
            )

            raise ReloadlyError(
                "The phone number belongs to "
                f"{detected_name}, not the selected operator. "
                f"Please select {detected_name} or enter a "
                "phone number belonging to the selected operator.",
                status_code=400,
                details={
                    "code": "OPERATOR_MISMATCH",
                    "selectedOperatorId": selected_operator_id,
                    "detectedOperatorId": detected_operator_id,
                    "detectedOperatorName": detected_name,
                    "phone": detected["phone"],
                    "countryCode": detected["countryCode"],
                },
            )

        logger.info(
            "Operator verification passed: operator=%s phone=%s",
            selected_operator_id,
            detected["phone"],
        )

        return detected

    # ============================================================
    # Airtime Operators
    # ============================================================

    async def get_operators(
        self,
        country_code: str = "ZW",
    ):
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
        return await self._request(
            "airtime",
            "GET",
            f"/operators/countries/{country_code}",
            params={
                "includeBundles": "true",
            },
        )

    # ============================================================
    # Bundles
    # ============================================================

    def _extract_bundles_from_operator(
        self,
        operator: dict,
    ) -> list:
        """
        Best-effort extraction of a bundle/product list out of an
        operator object returned by /operators/countries/{country}.
        Used as a fallback when the dedicated fixed-value endpoint
        isn't available or doesn't return usable data.
        """

        possible_bundle_keys = (
            "bundles",
            "bundle",
            "products",
            "fixedValue",
            "fixedValues",
            "package",
            "packages",
        )

        for key in possible_bundle_keys:

            value = operator.get(key)

            if isinstance(value, list):
                return value

            if isinstance(value, dict):

                nested = (
                    value.get("content")
                    or value.get("data")
                    or value.get("items")
                )

                if isinstance(nested, list):
                    return nested

        return []

    async def get_bundles(
        self,
        operator_id: int,
        country_code: str = "ZW",
    ):
        """
        Get bundles/products for an operator.

        We first try Reloadly's dedicated endpoint:

            GET /operators/{operatorId}/fixed-value

        This is the authoritative, documented source of bundle data
        and should work correctly in production. It was observed to
        return 404 for Econet in the Reloadly *sandbox* environment,
        so if it fails (404 or otherwise) we fall back to pulling
        bundle data out of the /operators/countries/{country} response
        instead of hard-failing. This means production gets the
        correct data source by default, while sandbox (and any other
        environment where the endpoint misbehaves) still works via
        the fallback.
        """

        operator_id = int(operator_id)

        # --------------------------------------------------------
        # Preferred path: dedicated fixed-value endpoint
        # --------------------------------------------------------

        try:
            fixed_value_result = await self._request(
                "airtime",
                "GET",
                f"/operators/{operator_id}/fixed-value",
            )

            if isinstance(fixed_value_result, list) and fixed_value_result:

                logger.info(
                    "Loaded bundles for operator=%s via /fixed-value "
                    "endpoint (%d items).",
                    operator_id,
                    len(fixed_value_result),
                )

                return {
                    "operator": {"id": operator_id},
                    "operatorId": operator_id,
                    "countryCode": country_code,
                    "bundles": fixed_value_result,
                    "source": "fixed-value",
                }

            logger.warning(
                "Reloadly /operators/%s/fixed-value returned no usable "
                "data (%r); falling back to country-operator scrape.",
                operator_id,
                fixed_value_result,
            )

        except ReloadlyError as exc:

            logger.warning(
                "Reloadly /operators/%s/fixed-value failed (%s); "
                "falling back to country-operator scrape. This is "
                "expected on Reloadly sandbox for some operators.",
                operator_id,
                exc.message,
            )

        # --------------------------------------------------------
        # Fallback path: scrape bundle data out of the country
        # operator listing.
        # --------------------------------------------------------

        data = await self.get_operators(
            country_code=country_code,
        )

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

        operator = None

        for item in operators:

            if not isinstance(item, dict):
                continue

            item_id = (
                item.get("id")
                or item.get("operatorId")
            )

            try:

                if (
                    item_id is not None
                    and int(item_id) == operator_id
                ):
                    operator = item
                    break

            except (TypeError, ValueError):
                continue

        if operator is None:

            raise ReloadlyError(
                f"Reloadly operator {operator_id} was not "
                f"found for country {country_code}.",
                status_code=404,
                details={
                    "operatorId": operator_id,
                    "countryCode": country_code,
                },
            )

        bundles = self._extract_bundles_from_operator(operator)

        logger.info(
            "Loaded bundles for operator=%s via country-operator "
            "fallback (%d items).",
            operator_id,
            len(bundles),
        )

        return {
            "operator": operator,
            "operatorId": operator_id,
            "countryCode": country_code,
            "bundles": bundles,
            "source": "country-operator-fallback",
        }

    # ============================================================
    # AIRTIME TOP-UP
    # ============================================================

    async def topup(
        self,
        *,
        operator_id: int,
        phone: str,
        amount: float,
        country_code: str = "ZW",
        custom_identifier: Optional[str] = None,
    ):
        """
        Send an airtime top-up.

        IMPORTANT:
        The phone/operator relationship is verified BEFORE the
        Reloadly /topups endpoint is called.
        """

        # --------------------------------------------------------
        # Validate amount
        # --------------------------------------------------------

        try:
            amount = float(amount)

        except (TypeError, ValueError):

            raise ReloadlyError(
                "Invalid top-up amount.",
                status_code=400,
            )

        if amount <= 0:

            raise ReloadlyError(
                "Top-up amount must be greater than zero.",
                status_code=400,
            )

        # --------------------------------------------------------
        # VERIFY OPERATOR BEFORE PAYMENT
        # --------------------------------------------------------

        detected = await self.verify_operator(
            operator_id=operator_id,
            phone=phone,
            country_code=country_code,
        )

        # Use the normalized phone returned by validation.
        normalized_phone = detected["phone"]

        # --------------------------------------------------------
        # Create unique transaction reference
        # --------------------------------------------------------

        reference = (
            custom_identifier
            or str(uuid.uuid4())
        )

        # --------------------------------------------------------
        # Reloadly top-up payload
        # --------------------------------------------------------

        payload = {
            "operatorId": int(operator_id),
            "amount": amount,
            "useLocalAmount": False,
            "customIdentifier": reference,
            "recipientPhone": {
                "countryCode": (
                    str(country_code)
                    .strip()
                    .upper()
                ),
                "number": normalized_phone,
            },
        }

        logger.info(
            "Submitting Reloadly airtime top-up: "
            "operator=%s phone=%s amount=%s",
            operator_id,
            normalized_phone,
            amount,
        )

        # --------------------------------------------------------
        # ONLY NOW send the actual top-up
        # --------------------------------------------------------

        return await self._request(
            "airtime",
            "POST",
            "/topups",
            json_body=payload,
        )

    # ============================================================
    # BUNDLE TOP-UP
    # ============================================================

    async def bundle_topup(
        self,
        *,
        operator_id: int,
        bundle_id: int,
        phone: str,
        country_code: str = "ZW",
        custom_identifier: Optional[str] = None,
    ):
        """
        Send a bundle/data top-up.

        The operator is verified against the phone number BEFORE
        the bundle transaction is submitted.
        """

        # --------------------------------------------------------
        # VERIFY OPERATOR BEFORE PAYMENT
        # --------------------------------------------------------

        detected = await self.verify_operator(
            operator_id=operator_id,
            phone=phone,
            country_code=country_code,
        )

        normalized_phone = detected["phone"]

        # --------------------------------------------------------
        # Create transaction reference
        # --------------------------------------------------------

        reference = (
            custom_identifier
            or str(uuid.uuid4())
        )

        payload = {
            "operatorId": int(operator_id),
            "productId": int(bundle_id),
            "useLocalAmount": False,
            "customIdentifier": reference,
            "recipientPhone": {
                "countryCode": (
                    str(country_code)
                    .strip()
                    .upper()
                ),
                "number": normalized_phone,
            },
        }

        logger.info(
            "Submitting Reloadly bundle top-up: "
            "operator=%s bundle=%s phone=%s",
            operator_id,
            bundle_id,
            normalized_phone,
        )

        # --------------------------------------------------------
        # ONLY NOW send the actual bundle
        # --------------------------------------------------------

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
        reference = (
            custom_identifier
            or str(uuid.uuid4())
        )

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
