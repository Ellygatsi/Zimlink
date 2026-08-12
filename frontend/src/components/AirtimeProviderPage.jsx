import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Phone, WifiHigh, CheckCircle, Spinner } from "@phosphor-icons/react";

import econetLogo from "@/Assets/econet.png";
import netoneLogo from "@/Assets/netone.png";

const QUICK_AMOUNTS = [2, 5, 10, 20, 50];

const PROVIDER_LOGOS = {
  econet: econetLogo,
  netone: netoneLogo,
};

export default function AirtimeProviderPage({ slug, name, initials = "", initialsColor = "text-neutral-700", logo }) {
  const providerLogo = logo || PROVIDER_LOGOS[slug?.toLowerCase()] || null;

  const [tab, setTab] = useState("airtime");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [bundles, setBundles] = useState(null);
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (tab !== "bundles" || bundles) return;

    api
      .get(`/reloadly/operators/${slug}/bundles`)
      .then(({ data }) => setBundles(data))
      .catch(() => setBundles([]));
  }, [tab, slug, bundles]);

  const effectiveAmount = customAmount ? Number(customAmount) : amount;

  const tabButtonClasses = (t) =>
    `flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs md:text-sm font-medium transition-colors ${
      tab === t
        ? "bg-green-600 text-black"
        : "bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400"
    }`;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!phone) {
      setError("Enter the recipient's phone number.");
      return;
    }

    if (tab === "airtime" && !effectiveAmount) {
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
          ? { operator: slug, phone, amount: effectiveAmount, type: "airtime" }
          : { operator: slug, phone, bundleId: selectedBundle.id, type: "bundle" };

      const { data } = await api.post("/reloadly/topup", payload);

      setSuccess(data?.message || "Top-up sent successfully.");
      setPhone("");
      setAmount(null);
      setCustomAmount("");
      setSelectedBundle(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 md:space-y-6" data-testid={`${slug}-page`}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-2 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
            {providerLogo ? (
              <img
                src={providerLogo}
                alt={`${name} logo`}
                className="h-full w-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <span className={`text-sm font-medium ${initialsColor}`}>{initials}</span>
            )}
          </div>

          <div>
            <p className="text-[10px] md:text-xs font-medium tracking-widest text-green-500 uppercase">
              Airtime
            </p>
            <h1 className="text-2xl md:text-5xl font-medium tracking-tight mt-1 text-black dark:text-white">
              {name}
            </h1>
          </div>
        </div>

        <Link
          to="/airtime"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium w-fit bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400"
        >
          Airtime & Bills
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 rounded-xl p-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => {
            setTab("airtime");
            setError(null);
            setSuccess(null);
          }}
          className={tabButtonClasses("airtime")}
          data-testid={`${slug}-tab-airtime`}
        >
          <Phone size={16} weight="bold" /> Airtime
        </button>

        <button
          type="button"
          onClick={() => {
            setTab("bundles");
            setError(null);
            setSuccess(null);
          }}
          className={tabButtonClasses("bundles")}
          data-testid={`${slug}-tab-bundles`}
        >
          <WifiHigh size={16} weight="bold" /> Bundles
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl p-6 md:p-8 max-w-md mx-auto bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
      >
        <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
          Recipient's phone number
        </label>

        <input
          type="tel"
          inputMode="tel"
          className="w-full mt-2 text-2xl md:text-3xl font-medium bg-transparent border-b-2 border-neutral-300 dark:border-neutral-700 focus:border-green-600 outline-none py-2 text-black dark:text-white"
          placeholder="+263 77 000 0000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
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
                    setError(null);
                  }}
                  className={`rounded-lg py-2.5 text-sm font-medium transition-colors ${
                    amount === val && !customAmount
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
                setCustomAmount(e.target.value);
                setAmount(null);
                setError(null);
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
                <Spinner size={18} className="animate-spin" />
                Loading bundles…
              </div>
            )}

            {bundles?.length === 0 && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 py-6 text-center">
                No bundles available right now.
              </p>
            )}

            {bundles && bundles.length > 0 && (
              <div className="grid grid-cols-1 gap-2">
                {bundles.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setSelectedBundle(b);
                      setError(null);
                    }}
                    className={`rounded-lg p-3 text-left border transition-colors ${
                      selectedBundle?.id === b.id
                        ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                        : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
                    }`}
                    data-testid={`${slug}-bundle-${b.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-black dark:text-white">{b.name}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{b.validity}</p>
                      </div>
                      <span className="text-sm font-medium text-green-600">${b.price}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-4 text-xs text-center text-red-600 dark:text-red-400" data-testid={`${slug}-error`}>
            {error}
          </p>
        )}

        {success && (
          <p
            className="mt-4 flex items-center justify-center gap-1.5 text-xs text-center text-green-600 dark:text-green-400"
            data-testid={`${slug}-success`}
          >
            <CheckCircle size={14} weight="fill" />
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-5 h-14 rounded-xl text-base font-medium bg-green-600 text-black flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
          data-testid={`${slug}-submit`}
        >
          {submitting ? (
            <>
              <Spinner size={20} className="animate-spin" />
              Sending…
            </>
          ) : tab === "airtime" ? (
            <>
              <Phone size={18} weight="fill" />
              Send {effectiveAmount ? `$${effectiveAmount}` : ""} airtime
            </>
          ) : (
            <>
              <WifiHigh size={18} weight="fill" />
              Buy bundle
            </>
          )}
        </button>
      </form>
    </div>
  );
}