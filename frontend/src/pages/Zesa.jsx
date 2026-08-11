import { useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import {
  ArrowLeft,
  Lightbulb,
  CheckCircle,
  Spinner,
  Copy,
} from "@phosphor-icons/react";

const QUICK_AMOUNTS = [5, 10, 20, 50, 100];

export default function Zesa() {
  const [meter, setMeter] = useState("");
  const [amount, setAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const effectiveAmount = customAmount ? Number(customAmount) : amount;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!meter || meter.length < 6) {
      setError("Enter a valid ZESA meter number.");
      return;
    }

    if (!effectiveAmount) {
      setError("Choose or enter an amount.");
      return;
    }

    setSubmitting(true);

    try {
      const { data } = await api.post("/reloadly/bills/zesa", {
        meterNumber: meter,
        amount: effectiveAmount,
      });

      setResult(data);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function copyToken() {
    if (result?.token) navigator.clipboard.writeText(result.token);
  }

  return (
    <div
      className="min-h-screen space-y-6 bg-white text-black transition-colors duration-300 dark:bg-black dark:text-white md:space-y-8"
      data-testid="zesa-page"
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
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/30 md:h-16 md:w-16">
            <Lightbulb
              size={24}
              weight="fill"
              className="text-amber-600 md:h-7 md:w-7"
            />
          </div>

          <div>
            <h1 className="text-xl font-medium tracking-tight text-black dark:text-white md:text-4xl">
              ZESA / ZETDC
            </h1>

            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 md:text-sm">
              Buy electricity tokens instantly
            </p>
          </div>
        </div>
      </div>

      {result ? (
        <div className="space-y-5 rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-900 dark:bg-green-950/30 md:rounded-2xl md:p-8">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle size={20} weight="fill" />
            <p className="text-sm font-medium md:text-base">Token purchased</p>
          </div>

          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400 md:text-xs">
              Token
            </p>

            <div className="mt-1.5 flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 dark:bg-black">
              <p className="font-mono text-base font-medium tracking-wider text-black dark:text-white md:text-lg">
                {result.token}
              </p>

              <button
                type="button"
                onClick={copyToken}
                className="text-neutral-400 hover:text-green-600"
                data-testid="zesa-copy-token"
              >
                <Copy size={18} weight="bold" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400 md:text-xs">
                Units
              </p>
              <p className="mt-1 font-medium text-black dark:text-white">
                {result.units} kWh
              </p>
            </div>

            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400 md:text-xs">
                Amount
              </p>
              <p className="mt-1 font-medium text-black dark:text-white">
                ${effectiveAmount}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setResult(null);
              setMeter("");
              setAmount(null);
              setCustomAmount("");
            }}
            className="w-full rounded-xl border border-neutral-200 py-3 text-sm font-medium text-black hover:border-green-500 dark:border-neutral-800 dark:text-white md:text-base"
          >
            Buy another token
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
          <div>
            <label
              htmlFor="meter"
              className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400 md:text-xs"
            >
              ZESA meter number
            </label>

            <input
              id="meter"
              type="text"
              inputMode="numeric"
              value={meter}
              onChange={(e) => setMeter(e.target.value)}
              placeholder="e.g. 01234567890"
              className="w-full rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-3 text-sm text-black outline-none transition-colors focus:border-green-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white md:text-base"
              data-testid="zesa-meter-input"
            />
          </div>

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
                  data-testid={`zesa-amount-${val}`}
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
              data-testid="zesa-custom-amount-input"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400 md:text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-sm font-medium text-black transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 md:py-4 md:text-base"
            data-testid="zesa-submit"
          >
            {submitting ? (
              <>
                <Spinner size={17} className="animate-spin" />
                Processing…
              </>
            ) : (
              `Buy token${effectiveAmount ? ` — $${effectiveAmount}` : ""}`
            )}
          </button>
        </form>
      )}
    </div>
  );
}