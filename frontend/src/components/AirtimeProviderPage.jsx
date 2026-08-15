import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import {
  Phone,
  WifiHigh,
  CheckCircle,
  Spinner,
  XCircle,
  ClockCounterClockwise,
  Wallet,
} from "@phosphor-icons/react";

import econetLogo from "@/Assets/econet.png";
import netoneLogo from "@/Assets/netone.png";

const QUICK_AMOUNTS = [2, 5, 10, 20, 50];

const PROVIDER_LOGOS = {
  econet: econetLogo,
  netone: netoneLogo,
};

function formatDate(dateStr) {
  if (!dateStr) return "";

  try {
    return new Date(dateStr).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function StatusPill({ status }) {
  const s = (status || "").toLowerCase();

  const styles =
    s === "success" || s === "completed"
      ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
      : s === "failed"
      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
      : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${styles}`}
    >
      {status || "pending"}
    </span>
  );
}

export default function AirtimeProviderPage({
  slug,
  name,
  initials = "",
  initialsColor = "text-neutral-700",
  logo,
}) {
  const providerLogo =
    logo || PROVIDER_LOGOS[slug?.toLowerCase()] || null;

  const [tab, setTab] = useState("airtime");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");

  const [bundles, setBundles] = useState(null);
  const [selectedBundle, setSelectedBundle] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [walletError, setWalletError] = useState(null);

  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState(null);

  useEffect(() => {
    if (tab !== "bundles" || bundles) return;

    api
      .get(`/reloadly/operators/${slug}/bundles`)
      .then(({ data }) => {
        setBundles(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setBundles([]);
      });
  }, [tab, slug, bundles]);

  const fetchHistory = useCallback(() => {
    setHistoryError(null);

    api
      .get(`/reloadly/topups?operator=${slug}`)
      .then(({ data }) => {
        setHistory(
          Array.isArray(data)
            ? data
            : data?.topups || []
        );
      })
      .catch(() => {
        setHistory([]);
        setHistoryError(
          "Couldn't load your top-up history."
        );
      });
  }, [slug]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const effectiveAmount = customAmount
    ? Number(customAmount)
    : amount;

  const selectedBundlePrice = selectedBundle
    ? Number(
        selectedBundle.price ||
          selectedBundle.fixedAmount ||
          selectedBundle.amount ||
          0
      )
    : 0;

  const tabButtonClasses = (t) =>
    `flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs md:text-sm font-medium transition-colors ${
      tab === t
        ? "bg-green-600 text-black"
        : "bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400"
    }`;

  function clearMessages() {
    setError(null);
    setSuccess(null);
    setWalletError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    clearMessages();

    if (!phone.trim()) {
      setError(
        "Enter the recipient's phone number."
      );
      return;
    }

    if (
      tab === "airtime" &&
      (!effectiveAmount ||
        Number.isNaN(effectiveAmount) ||
        effectiveAmount <= 0)
    ) {
      setError("Choose or enter an amount.");
      return;
    }

    if (tab === "bundles" && !selectedBundle) {
      setError("Choose a bundle.");
      return;
    }

    setSubmitting(true);

    try {
      const payload =
        tab === "airtime"
          ? {
              operator: slug,
              phone: phone.trim(),
              amount: Number(effectiveAmount),
              type: "airtime",
            }
          : {
              operator: slug,
              phone: phone.trim(),
              bundleId: String(selectedBundle.id),
              type: "bundle",
            };

      const { data } = await api.post(
        "/reloadly/topup",
        payload
      );

      setSuccess(
        data?.message ||
          "Top-up sent successfully."
      );

      setPhone("");
      setAmount(null);
      setCustomAmount("");
      setSelectedBundle(null);

      fetchHistory();
    } catch (err) {
      const responseData =
        err?.response?.data;

      /*
       * FastAPI can return:
       *
       * {
       *   detail: {
       *     code: "...",
       *     message: "...",
       *     balance: 2.50,
       *     required: 5.00
       *   }
       * }
       */

      const detail =
        responseData?.detail;

      const detailObject =
        typeof detail === "object" &&
        detail !== null
          ? detail
          : null;

      const errorCode =
        detailObject?.code ||
        responseData?.code;

      if (
        errorCode ===
        "INSUFFICIENT_WALLET_BALANCE"
      ) {
        setWalletError({
          message:
            detailObject?.message ||
            "Insufficient wallet balance. Please reload your wallet to continue.",
          balance:
            Number(detailObject?.balance || 0),
          required:
            Number(detailObject?.required || 0),
        });

        return;
      }

      let message =
        detailObject?.message ||
        responseData?.message ||
        (typeof detail === "string"
          ? detail
          : null) ||
        "Something went wrong. Please try again.";

      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="space-y-8 md:space-y-10"
      data-testid={`${slug}-page`}
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <p className="text-[10px] md:text-xs font-medium tracking-widest text-green-500 uppercase">
            Airtime
          </p>

          <h1 className="text-3xl md:text-6xl font-medium tracking-tight mt-1.5 md:mt-2 text-black dark:text-white">
            {name}.
          </h1>

          <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 md:mt-2">
            Send airtime or a data bundle instantly.
          </p>
        </div>

        <Link
          to="/airtime"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium w-fit bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400"
        >
          Airtime & Bills
        </Link>
      </div>

      <div className="rounded-2xl p-6 md:p-8 max-w-md mx-auto bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-2 dark:bg-neutral-950">
            {providerLogo ? (
              <img
                src={providerLogo}
                alt={`${name} logo`}
                className="h-full w-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display =
                    "none";
                }}
              />
            ) : (
              <span
                className={`text-sm font-medium ${initialsColor}`}
              >
                {initials}
              </span>
            )}
          </div>

          <div className="flex gap-2 rounded-xl p-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex-1">
            <button
              type="button"
              onClick={() => {
                setTab("airtime");
                clearMessages();
              }}
              className={tabButtonClasses(
                "airtime"
              )}
              data-testid={`${slug}-tab-airtime`}
            >
              <Phone
                size={14}
                weight="bold"
              />
              Airtime
            </button>

            <button
              type="button"
              onClick={() => {
                setTab("bundles");
                clearMessages();
              }}
              className={tabButtonClasses(
                "bundles"
              )}
              data-testid={`${slug}-tab-bundles`}
            >
              <WifiHigh
                size={14}
                weight="bold"
              />
              Bundles
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
            Phone number
          </label>

          <input
            type="tel"
            inputMode="tel"
            className="w-full mt-2 text-2xl md:text-3xl font-medium bg-transparent border-b-2 border-neutral-300 dark:border-neutral-700 focus:border-green-600 outline-none py-2 text-black dark:text-white"
            placeholder="+263 77 000 0000"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              clearMessages();
            }}
            data-testid={`${slug}-phone-input`}
          />

          {tab === "airtime" ? (
            <div className="mt-6">
              <p className="text-xs font-medium tracking-widest text-neutral-500 uppercase mb-2.5">
                Amount (USD)
              </p>

              <div className="grid grid-cols-5 gap-2">
                {QUICK_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setAmount(val);
                      setCustomAmount("");
                      clearMessages();
                    }}
                    className={`rounded-lg py-2.5 text-sm font-medium transition-colors ${
                      amount === val &&
                      !customAmount
                        ? "bg-green-600 text-black"
                        : "bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white"
                    }`}
                    data-testid={`${slug}-amount-${val}`}
                  >
                    ${val}
                  </button>
                ))}
              </div>

              <input
                type="number"
                min="1"
                step="0.01"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(
                    e.target.value
                  );
                  setAmount(null);
                  clearMessages();
                }}
                placeholder="Or enter a custom amount"
                className="w-full mt-3 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none focus:border-green-600 text-black dark:text-white"
                data-testid={`${slug}-custom-amount-input`}
              />
            </div>
          ) : (
            <div className="mt-6">
              <p className="text-xs font-medium tracking-widest text-neutral-500 uppercase mb-2.5">
                Choose a bundle
              </p>

              {bundles === null && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-neutral-500 dark:text-neutral-400">
                  <Spinner
                    size={18}
                    className="animate-spin"
                  />
                  Loading bundles…
                </div>
              )}

              {bundles?.length === 0 && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 py-6 text-center">
                  No bundles available right now.
                </p>
              )}

              {bundles &&
                bundles.length > 0 && (
                  <div className="grid grid-cols-1 gap-2">
                    {bundles.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setSelectedBundle(
                            b
                          );
                          clearMessages();
                        }}
                        className={`rounded-lg p-3 text-left border transition-colors ${
                          selectedBundle?.id ===
                          b.id
                            ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                            : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
                        }`}
                        data-testid={`${slug}-bundle-${b.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-black dark:text-white">
                              {b.name}
                            </p>

                            <p className="text-xs text-neutral-500 mt-0.5">
                              {b.validity}
                            </p>
                          </div>

                          <span className="text-sm font-medium text-green-600">
                            ${b.price}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-5 h-14 rounded-xl text-base font-medium bg-green-600 text-black flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
            data-testid={`${slug}-submit`}
          >
            {submitting ? (
              <>
                <Spinner
                  size={20}
                  className="animate-spin"
                />
                Sending…
              </>
            ) : tab === "airtime" ? (
              <>
                <Phone
                  size={18}
                  weight="fill"
                />
                Send{" "}
                {effectiveAmount
                  ? `$${effectiveAmount}`
                  : ""}{" "}
                airtime
              </>
            ) : (
              <>
                <WifiHigh
                  size={18}
                  weight="fill"
                />
                Buy{" "}
                {selectedBundlePrice
                  ? `$${selectedBundlePrice}`
                  : ""}{" "}
                bundle
              </>
            )}
          </button>

          {/* ======================================================
              INSUFFICIENT WALLET BALANCE
          ======================================================= */}

          {walletError && (
            <div
              className="mt-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4"
              data-testid={`${slug}-insufficient-wallet`}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  <Wallet
                    size={20}
                    weight="bold"
                    className="text-red-600 dark:text-red-400"
                  />
                </div>

                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                    Insufficient wallet balance
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-600 dark:text-red-400">
                    Your wallet has{" "}
                    <strong>
                      $
                      {walletError.balance.toFixed(
                        2
                      )}
                    </strong>
                    , but you need{" "}
                    <strong>
                      $
                      {walletError.required.toFixed(
                        2
                      )}
                    </strong>{" "}
                    to complete this purchase.
                  </p>

                  <Link
                    to="/wallet"
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                  >
                    <Wallet
                      size={15}
                      weight="bold"
                    />
                    Reload Wallet
                  </Link>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p
              className="mt-3 text-xs text-center text-red-600 dark:text-red-400 flex items-center justify-center gap-1.5"
              data-testid={`${slug}-error`}
            >
              <XCircle
                size={14}
                weight="bold"
              />
              {error}
            </p>
          )}

          {success && (
            <p
              className="mt-3 text-xs text-center text-green-600 dark:text-green-400 flex items-center justify-center gap-1.5"
              data-testid={`${slug}-success`}
            >
              <CheckCircle
                size={14}
                weight="fill"
              />
              {success}
            </p>
          )}
        </form>
      </div>

      {/* ==========================================================
          TOP-UP HISTORY
      =========================================================== */}

      <div
        className="max-w-3xl mx-auto"
        data-testid={`${slug}-history`}
      >
        <div className="flex items-center gap-2 mb-3">
          <ClockCounterClockwise
            size={16}
            weight="bold"
            className="text-green-600"
          />

          <p className="text-[10px] md:text-xs font-medium tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">
            {name} top-up history
          </p>
        </div>

        {history === null && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-500 dark:text-neutral-400 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <Spinner
              size={18}
              className="animate-spin"
            />
            Loading history…
          </div>
        )}

        {historyError && (
          <p className="text-xs text-center text-red-600 dark:text-red-400 py-3">
            {historyError}
          </p>
        )}

        {history?.length === 0 &&
          !historyError && (
            <div className="py-10 text-center rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                No {name} top-ups yet.
              </p>
            </div>
          )}

        {history &&
          history.length > 0 && (
            <>
              {/* Mobile */}
              <div className="grid grid-cols-1 gap-2.5 md:hidden">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="rounded-xl p-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
                    data-testid={`${slug}-history-item-${h.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-black dark:text-white">
                        {h.phone}
                      </p>

                      <StatusPill
                        status={h.status}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {h.type ===
                        "bundle"
                          ? h.bundleName ||
                            "Bundle"
                          : "Airtime"}{" "}
                        ·{" "}
                        {formatDate(
                          h.created_at ||
                            h.createdAt
                        )}
                      </p>

                      <p className="text-sm font-medium text-green-600">
                        {h.amount
                          ? `$${Number(
                              h.amount
                            ).toFixed(2)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden md:block rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-100 dark:bg-neutral-900 text-left text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">
                      <th className="px-4 py-3 font-medium">
                        Phone
                      </th>

                      <th className="px-4 py-3 font-medium">
                        Type
                      </th>

                      <th className="px-4 py-3 font-medium">
                        Amount
                      </th>

                      <th className="px-4 py-3 font-medium">
                        Date
                      </th>

                      <th className="px-4 py-3 font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.map((h) => (
                      <tr
                        key={h.id}
                        className="border-t border-neutral-200 dark:border-neutral-800"
                        data-testid={`${slug}-history-row-${h.id}`}
                      >
                        <td className="px-4 py-3 text-black dark:text-white">
                          {h.phone}
                        </td>

                        <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                          {h.type ===
                          "bundle"
                            ? h.bundleName ||
                              "Bundle"
                            : "Airtime"}
                        </td>

                        <td className="px-4 py-3 font-medium text-green-600">
                          {h.amount
                            ? `$${Number(
                                h.amount
                              ).toFixed(2)}`
                            : "—"}
                        </td>

                        <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                          {formatDate(
                            h.created_at ||
                              h.createdAt
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <StatusPill
                            status={
                              h.status
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
      </div>
    </div>
  );
}