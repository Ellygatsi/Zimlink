import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import {
  ArrowLeft,
  Phone,
  WifiHigh,
  CheckCircle,
  Spinner,
} from "@phosphor-icons/react";

const QUICK_AMOUNTS = [2, 5, 10, 20, 50];

export default function AirtimeProviderPage({
  slug,
  name,
  color,
  initials,
  initialsColor,
  logo,
}) {
  const [tab, setTab] = useState("airtime"); // "airtime" | "bundles"

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
      setError(
        err?.response?.data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen space-y-6 bg-white text-black transition-colors duration-300 dark:bg-black dark:text-white md:space-y-8"
      data-testid={`${slug}-page`}
    >
      {/* Header */}
      <div>
        <Link
          to="/airtime"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-green-600 dark:text-neutral-400 md:mb-4 md:text-sm"
        >
          <ArrowLeft size={15} weight="bold" />
          Back to Airtime & Bills
        </Link>

        <div className="flex items-center gap-3.5 md:gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full ${color} md:h-16 md:w-16`}
          >
            {logo ? (
              <img
                src={logo}
                alt={name}
                className="h-8 w-8 object-contain md:h-10 md:w-10"
              />
            ) : (
              <span className={`text-sm font-semibold ${initialsColor} md:text-base`}>
                {initials}
              </span>
            )}
          </div>

          <div>
            <h1 className="text-xl font-medium tracking-tight text-black dark:text-white md:text-4xl">
              {name}
            </h1>

            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 md:text-sm">
              Airtime & bundles, delivered instantly
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => setTab("airtime")}
          className={`flex items-center gap-1.5 border-b-2 px-1 pb-2.5 text-xs font-medium transition-colors md:text-sm ${
            tab === "airtime"
              ? "border-green-600 text-green-600"
              : "border-transparent text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white"
          }`}
          data-testid={`${slug}-tab-airtime`}
        >
          <Phone size={15} weight="fill" />
          Airtime
        </button>

        <button
          type="button"
          onClick={() => setTab("bundles")}
          className={`flex items-center gap-1.5 border-b-2 px-1 pb-2.5 text-xs font-medium transition-colors md:text-sm ${
            tab === "bundles"
              ? "border-green-600 text-green-600"
              : "border-transparent text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white"
          }`}
          data-testid={`${slug}-tab-bundles`}
        >
          <WifiHigh size={15} weight="fill" />
          Bundles
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
        {/* Phone number */}
        <div>
          <label
            htmlFor="phone"
            className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400 md:text-xs"
          >
            Recipient's phone number
          </label>

          <input
            id="phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 077 123 4567"
            className="w-full rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-3 text-sm text-black outline-none transition-colors focus:border-green-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white md:text-base"
            data-testid={`${slug}-phone-input`}
          />
        </div>

        {tab === "airtime" ? (
          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400 md:text-xs">
              Amount (USD)
            </p>

            <div className="grid grid-cols-5 gap-2 md:gap-3">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setAmount(val);
                    setCustomAmount("");
                  }}
                  className={`rounded-xl border py-3 text-sm font-medium transition-colors md:py-4 md:text-base ${
                    amount === val && !customAmount
                      ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                      : "border-neutral-200 bg-neutral-100 text-black hover:border-green-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
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
              }}
              placeholder="Or enter a custom amount"
              className="mt-3 w-full rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-3 text-sm text-black outline-none transition-colors focus:border-green-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white md:text-base"
              data-testid={`${slug}-custom-amount-input`}
            />
          </div>
        ) : (
          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400 md:text-xs">
              Choose a bundle
            </p>

            {bundles === null && (
              <div className="flex items-center gap-2 py-8 text-sm text-neutral-500 dark:text-neutral-400">
                <Spinner size={16} className="animate-spin" />
                Loading bundles…
              </div>
            )}

            {bundles?.length === 0 && (
              <p className="py-8 text-sm text-neutral-500 dark:text-neutral-400">
                No bundles available right now. Please check back later.
              </p>
            )}

            {bundles && bundles.length > 0 && (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:gap-3">
                {bundles.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBundle(b)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      selectedBundle?.id === b.id
                        ? "border-green-500 bg-green-50 dark:bg-green-950/40"
                        : "border-neutral-200 bg-neutral-100 hover:border-green-500 dark:border-neutral-800 dark:bg-neutral-900"
                    }`}
                    data-testid={`${slug}-bundle-${b.id}`}
                  >
                    <p className="text-sm font-medium text-black dark:text-white md:text-base">
                      {b.name}
                    </p>

                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {b.validity}
                    </p>

                    <p className="mt-2 text-base font-medium text-green-600 md:text-lg">
                      ${b.price}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400 md:text-sm">
            {error}
          </p>
        )}

        {success && (
          <p className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-xs text-green-700 dark:bg-green-950/30 dark:text-green-400 md:text-sm">
            <CheckCircle size={16} weight="fill" />
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-sm font-medium text-black transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 md:py-4 md:text-base"
          data-testid={`${slug}-submit`}
        >
          {submitting ? (
            <>
              <Spinner size={17} className="animate-spin" />
              Sending…
            </>
          ) : tab === "airtime" ? (
            `Send ${effectiveAmount ? `$${effectiveAmount}` : ""} airtime`
          ) : (
            "Buy bundle"
          )}
        </button>
      </form>
    </div>
  );
}