import { useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Lightbulb, CheckCircle, Spinner, Copy } from "@phosphor-icons/react";

import zetdcLogo from "@/Assets/Zetdc.png";

const QUICK_AMOUNTS = [5, 10, 20, 50, 100];

export default function Zesa() {
  const [meter, setMeter] = useState("");
  const [amount, setAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

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
      setError(err?.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function copyToken() {
    if (!result?.token) return;

    navigator.clipboard.writeText(result.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function resetPurchase() {
    setResult(null);
    setMeter("");
    setAmount(null);
    setCustomAmount("");
    setError(null);
    setCopied(false);
  }

  return (
    <div className="space-y-5 md:space-y-6" data-testid="zesa-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-2 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
            <img
              src={zetdcLogo}
              alt="ZESA / ZETDC logo"
              className="h-full w-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>

          <div>
            <p className="text-[10px] md:text-xs font-medium tracking-widest text-green-500 uppercase">
              Bill payments
            </p>
            <h1 className="text-2xl md:text-5xl font-medium tracking-tight mt-1 text-black dark:text-white">
              ZESA / ZETDC
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

      {result ? (
        <div
          className="rounded-2xl p-6 md:p-8 max-w-md mx-auto bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
          data-testid="zesa-result"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-black">
              <CheckCircle size={18} weight="fill" />
            </span>
            <div>
              <p className="font-medium text-sm text-black dark:text-white">Token purchased</p>
              <p className="text-xs text-neutral-500 mt-0.5">Your electricity token is ready</p>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
                Token
              </label>
              {copied && <span className="text-xs font-medium text-green-600">Copied!</span>}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 px-3 py-2.5">
              <p className="font-mono text-base font-medium tracking-wider text-black dark:text-white break-all">
                {result.token}
              </p>

              <button
                type="button"
                onClick={copyToken}
                className="shrink-0 text-neutral-400 hover:text-green-600"
                data-testid="zesa-copy-token"
                aria-label="Copy electricity token"
              >
                <Copy size={18} weight="bold" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-3">
              <p className="text-[10px] font-medium tracking-widest text-neutral-400 uppercase">Units</p>
              <p className="mt-1 text-sm font-medium text-black dark:text-white">{result.units} kWh</p>
            </div>

            <div className="rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-3">
              <p className="text-[10px] font-medium tracking-widest text-neutral-400 uppercase">Amount</p>
              <p className="mt-1 text-sm font-medium text-green-600">${effectiveAmount}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={resetPurchase}
            className="w-full mt-5 h-12 rounded-xl text-sm font-medium bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white transition-opacity hover:opacity-80"
          >
            Buy another token
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-6 md:p-8 max-w-md mx-auto bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
        >
          <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
            ZESA meter number
          </label>

          <input
            type="text"
            inputMode="numeric"
            className="w-full mt-2 text-2xl md:text-3xl font-medium bg-transparent border-b-2 border-neutral-300 dark:border-neutral-700 focus:border-green-600 outline-none py-2 text-black dark:text-white"
            placeholder="01234567890"
            value={meter}
            onChange={(e) => {
              setMeter(e.target.value);
              setError(null);
            }}
            data-testid="zesa-meter-input"
          />

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
                setError(null);
              }}
              placeholder="Or enter a custom amount"
              className="w-full mt-3 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none focus:border-green-600 text-black dark:text-white"
              data-testid="zesa-custom-amount-input"
            />
          </div>

          {error && (
            <p className="mt-4 text-xs text-center text-red-600 dark:text-red-400" data-testid="zesa-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-5 h-14 rounded-xl text-base font-medium bg-green-600 text-black flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
            data-testid="zesa-submit"
          >
            {submitting ? (
              <>
                <Spinner size={20} className="animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Lightbulb size={18} weight="fill" />
                Buy token{effectiveAmount ? ` — $${effectiveAmount}` : ""}
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}