import { useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import {
  ArrowLeft,
  Lightbulb,
  CheckCircle,
  Spinner,
  Copy,
  ShieldCheck,
  Lightning,
} from "@phosphor-icons/react";

import zetdcLogo from "@/Assets/Zetdc.png";
import zimlinkLogo from "@/Assets/logo.png";
import zimlinkDarkLogo from "@/Assets/logo-dark.png";

const QUICK_AMOUNTS = [5, 10, 20, 50, 100];

export default function Zesa() {
  const [meter, setMeter] = useState("");
  const [amount, setAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const effectiveAmount = customAmount
    ? Number(customAmount)
    : amount;

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
      const { data } = await api.post(
        "/reloadly/bills/zesa",
        {
          meterNumber: meter,
          amount: effectiveAmount,
        }
      );

      setResult(data);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function copyToken() {
    if (!result?.token) return;

    navigator.clipboard.writeText(result.token);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
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
    <div
      className="
        min-h-screen
        bg-gradient-to-br
        from-neutral-50
        via-white
        to-green-50/40
        px-4
        py-6
        text-black
        transition-colors
        duration-300
        dark:from-black
        dark:via-neutral-950
        dark:to-green-950/20
        dark:text-white
        md:px-8
        md:py-10
      "
      data-testid="zesa-page"
    >
      <div className="mx-auto max-w-3xl">

        {/* ========================================================= */}
        {/* BACK */}
        {/* ========================================================= */}

        <Link
          to="/airtime"
          className="
            mb-5
            inline-flex
            items-center
            gap-2
            rounded-xl
            px-2
            py-2
            text-sm
            font-semibold
            text-neutral-500
            transition-all
            hover:-translate-x-1
            hover:text-green-600
            dark:text-neutral-400
            dark:hover:text-green-400
          "
        >
          <ArrowLeft
            size={17}
            weight="bold"
          />

          Back to Airtime & Bills
        </Link>


        {/* ========================================================= */}
        {/* HEADER */}
        {/* ========================================================= */}

        <div
          className="
            relative
            mb-6
            overflow-hidden
            rounded-[2rem]
            border
            border-neutral-200
            bg-white
            p-6
            shadow-xl
            shadow-neutral-200/40
            dark:border-neutral-800
            dark:bg-neutral-950
            dark:shadow-black/30
            md:p-8
          "
        >

          {/* Decorative glow */}
          <div
            className="
              pointer-events-none
              absolute
              -right-20
              -top-20
              h-56
              w-56
              rounded-full
              bg-amber-400/10
              blur-3xl
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              -bottom-20
              -left-20
              h-48
              w-48
              rounded-full
              bg-green-400/10
              blur-3xl
            "
          />

          <div className="relative">

            {/* Brand */}
            <div className="mb-6 flex items-center gap-2">

              <div
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-xl
                  bg-green-600
                  text-white
                  shadow-lg
                  shadow-green-600/20
                "
              >
                <Lightning
                  size={17}
                  weight="fill"
                />
              </div>

              <span
                className="
                  text-xs
                  font-bold
                  uppercase
                  tracking-[0.18em]
                  text-green-600
                "
              >
                Zimlink Bills
              </span>

            </div>


            {/* Provider */}
            <div className="flex items-center gap-5">

              {/* ZETDC LOGO */}
              <div
                className="
                  flex
                  h-20
                  w-20
                  shrink-0
                  items-center
                  justify-center
                  overflow-hidden
                  rounded-3xl
                  border
                  border-neutral-100
                  bg-white
                  p-3
                  shadow-lg
                  shadow-neutral-200/60
                  dark:border-neutral-800
                  dark:bg-neutral-900
                  dark:shadow-black/30
                  md:h-24
                  md:w-24
                  md:p-4
                "
              >
                <img
                  src={zetdcLogo}
                  alt="ZESA / ZETDC logo"
                  className="
                    h-full
                    w-full
                    object-contain
                  "
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>


              <div>

                <h1
                  className="
                    text-2xl
                    font-black
                    tracking-tight
                    text-neutral-950
                    dark:text-white
                    md:text-3xl
                  "
                >
                  ZESA / ZETDC
                </h1>

                <p
                  className="
                    mt-1.5
                    text-sm
                    text-neutral-500
                    dark:text-neutral-400
                  "
                >
                  Buy electricity tokens instantly
                </p>

                <div className="mt-3">

                  <span
                    className="
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-full
                      bg-green-50
                      px-3
                      py-1
                      text-xs
                      font-semibold
                      text-green-700
                      dark:bg-green-950/40
                      dark:text-green-400
                    "
                  >
                    <CheckCircle
                      size={13}
                      weight="fill"
                    />

                    Available
                  </span>

                </div>

              </div>
            </div>

          </div>
        </div>


        {/* ========================================================= */}
        {/* SUCCESS / TOKEN RESULT */}
        {/* ========================================================= */}

        {result ? (

          <div
            className="
              overflow-hidden
              rounded-[2rem]
              border
              border-green-200
              bg-white
              shadow-xl
              shadow-green-600/10
              dark:border-green-900/60
              dark:bg-neutral-950
            "
          >

            <div className="p-5 md:p-8">

              {/* Success heading */}
              <div
                className="
                  mb-7
                  flex
                  items-center
                  gap-3
                "
              >

                <div
                  className="
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-2xl
                    bg-green-100
                    text-green-600
                    dark:bg-green-950/50
                    dark:text-green-400
                  "
                >
                  <CheckCircle
                    size={24}
                    weight="fill"
                  />
                </div>

                <div>

                  <p
                    className="
                      text-lg
                      font-black
                      text-neutral-950
                      dark:text-white
                    "
                  >
                    Token purchased
                  </p>

                  <p
                    className="
                      mt-0.5
                      text-xs
                      text-neutral-500
                      dark:text-neutral-400
                    "
                  >
                    Your electricity token is ready
                  </p>

                </div>

              </div>


              {/* =================================================== */}
              {/* TOKEN */}
              {/* =================================================== */}

              <div>

                <div
                  className="
                    mb-2.5
                    flex
                    items-center
                    justify-between
                  "
                >

                  <p
                    className="
                      text-xs
                      font-bold
                      uppercase
                      tracking-[0.15em]
                      text-neutral-500
                      dark:text-neutral-400
                    "
                  >
                    Electricity token
                  </p>

                  {copied && (
                    <span
                      className="
                        text-xs
                        font-semibold
                        text-green-600
                      "
                    >
                      Copied!
                    </span>
                  )}

                </div>


                <div
                  className="
                    flex
                    items-center
                    gap-3
                    rounded-2xl
                    border
                    border-neutral-200
                    bg-neutral-50
                    p-4
                    dark:border-neutral-800
                    dark:bg-neutral-900
                  "
                >

                  <div
                    className="
                      min-w-0
                      flex-1
                    "
                  >

                    <p
                      className="
                        break-all
                        font-mono
                        text-lg
                        font-bold
                        tracking-[0.12em]
                        text-neutral-950
                        dark:text-white
                        md:text-xl
                      "
                    >
                      {result.token}
                    </p>

                  </div>


                  <button
                    type="button"
                    onClick={copyToken}
                    className="
                      flex
                      h-11
                      w-11
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-white
                      text-neutral-500
                      shadow-sm
                      transition-all
                      hover:bg-green-600
                      hover:text-white
                      dark:bg-neutral-800
                      dark:text-neutral-400
                      dark:hover:bg-green-600
                      dark:hover:text-white
                    "
                    data-testid="zesa-copy-token"
                    aria-label="Copy electricity token"
                  >
                    <Copy
                      size={19}
                      weight="bold"
                    />
                  </button>

                </div>

              </div>


              {/* =================================================== */}
              {/* DETAILS */}
              {/* =================================================== */}

              <div
                className="
                  mt-5
                  grid
                  grid-cols-2
                  gap-3
                "
              >

                <div
                  className="
                    rounded-2xl
                    bg-neutral-50
                    p-4
                    dark:bg-neutral-900
                  "
                >

                  <p
                    className="
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-[0.15em]
                      text-neutral-400
                    "
                  >
                    Units
                  </p>

                  <p
                    className="
                      mt-1
                      text-lg
                      font-black
                      text-neutral-950
                      dark:text-white
                    "
                  >
                    {result.units}{" "}
                    <span
                      className="
                        text-xs
                        font-semibold
                        text-neutral-500
                      "
                    >
                      kWh
                    </span>
                  </p>

                </div>


                <div
                  className="
                    rounded-2xl
                    bg-neutral-50
                    p-4
                    dark:bg-neutral-900
                  "
                >

                  <p
                    className="
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-[0.15em]
                      text-neutral-400
                    "
                  >
                    Amount
                  </p>

                  <p
                    className="
                      mt-1
                      text-lg
                      font-black
                      text-green-600
                    "
                  >
                    ${effectiveAmount}
                  </p>

                </div>

              </div>


              {/* Meter */}
              <div
                className="
                  mt-3
                  rounded-2xl
                  bg-neutral-50
                  p-4
                  dark:bg-neutral-900
                "
              >

                <p
                  className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.15em]
                    text-neutral-400
                  "
                >
                  Meter number
                </p>

                <p
                  className="
                    mt-1
                    font-mono
                    text-sm
                    font-semibold
                    text-neutral-900
                    dark:text-white
                  "
                >
                  {meter}
                </p>

              </div>


              {/* New purchase */}
              <button
                type="button"
                onClick={resetPurchase}
                className="
                  mt-6
                  w-full
                  rounded-2xl
                  border
                  border-neutral-200
                  bg-white
                  py-4
                  text-sm
                  font-bold
                  text-neutral-900
                  transition-all
                  hover:-translate-y-0.5
                  hover:border-green-500
                  hover:text-green-600
                  dark:border-neutral-800
                  dark:bg-neutral-900
                  dark:text-white
                  dark:hover:border-green-600
                  dark:hover:text-green-400
                "
              >
                Buy another token
              </button>

            </div>


            {/* Security footer */}
            <div
              className="
                border-t
                border-green-100
                bg-green-50/50
                px-5
                py-4
                dark:border-green-950
                dark:bg-green-950/20
                md:px-8
              "
            >

              <div
                className="
                  flex
                  items-center
                  justify-center
                  gap-2
                  text-center
                "
              >

                <ShieldCheck
                  size={17}
                  weight="duotone"
                  className="text-green-600"
                />

                <p
                  className="
                    text-xs
                    font-medium
                    text-green-700
                    dark:text-green-400
                  "
                >
                  Keep this token safe until it has been entered
                  into your meter.
                </p>

              </div>

            </div>

          </div>

        ) : (

          /* ========================================================= */
          /* PURCHASE FORM */
          /* ========================================================= */

          <form
            onSubmit={handleSubmit}
            className="
              overflow-hidden
              rounded-[2rem]
              border
              border-neutral-200
              bg-white
              shadow-xl
              shadow-neutral-200/40
              dark:border-neutral-800
              dark:bg-neutral-950
              dark:shadow-black/30
            "
          >

            <div className="p-5 md:p-8">

              {/* =================================================== */}
              {/* METER */}
              {/* =================================================== */}

              <div className="mb-8">

                <div className="mb-2.5 flex items-center justify-between">

                  <label
                    htmlFor="meter"
                    className="
                      text-xs
                      font-bold
                      uppercase
                      tracking-[0.15em]
                      text-neutral-500
                      dark:text-neutral-400
                    "
                  >
                    ZESA meter number
                  </label>

                  <span
                    className="
                      rounded-full
                      bg-amber-50
                      px-2.5
                      py-1
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-wider
                      text-amber-700
                      dark:bg-amber-950/40
                      dark:text-amber-400
                    "
                  >
                    Electricity
                  </span>

                </div>

                <input
                  id="meter"
                  type="text"
                  inputMode="numeric"
                  value={meter}
                  onChange={(e) => {
                    setMeter(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. 01234567890"
                  className="
                    w-full
                    rounded-2xl
                    border
                    border-neutral-200
                    bg-neutral-50
                    px-4
                    py-4
                    text-base
                    font-semibold
                    tracking-wide
                    text-black
                    outline-none
                    transition-all
                    placeholder:text-neutral-400
                    focus:border-green-500
                    focus:bg-white
                    focus:ring-4
                    focus:ring-green-500/10
                    dark:border-neutral-800
                    dark:bg-neutral-900
                    dark:text-white
                    dark:placeholder:text-neutral-600
                    dark:focus:bg-neutral-950
                  "
                  data-testid="zesa-meter-input"
                />

                <p
                  className="
                    mt-2
                    text-xs
                    text-neutral-400
                  "
                >
                  Enter the meter number shown on your
                  electricity meter or previous token receipt.
                </p>

              </div>


              {/* =================================================== */}
              {/* AMOUNT */}
              {/* =================================================== */}

              <div>

                <div className="mb-4 flex items-center justify-between">

                  <div>

                    <p
                      className="
                        text-xs
                        font-bold
                        uppercase
                        tracking-[0.15em]
                        text-neutral-500
                        dark:text-neutral-400
                      "
                    >
                      Select amount
                    </p>

                    <p
                      className="
                        mt-1
                        text-xs
                        text-neutral-400
                      "
                    >
                      Choose an amount or enter your own
                    </p>

                  </div>

                  <span
                    className="
                      rounded-lg
                      bg-green-50
                      px-2.5
                      py-1
                      text-xs
                      font-bold
                      text-green-700
                      dark:bg-green-950/40
                      dark:text-green-400
                    "
                  >
                    USD
                  </span>

                </div>


                {/* Quick amounts */}
                <div
                  className="
                    grid
                    grid-cols-2
                    gap-3
                    sm:grid-cols-5
                  "
                >
                  {QUICK_AMOUNTS.map((val) => {

                    const selected =
                      amount === val &&
                      !customAmount;

                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setAmount(val);
                          setCustomAmount("");
                          setError(null);
                        }}
                        className={`
                          relative
                          rounded-2xl
                          border
                          px-3
                          py-4
                          text-sm
                          font-bold
                          transition-all
                          duration-200
                          ${
                            selected
                              ? `
                                border-green-500
                                bg-green-600
                                text-white
                                shadow-lg
                                shadow-green-600/20
                              `
                              : `
                                border-neutral-200
                                bg-neutral-50
                                text-neutral-800
                                hover:-translate-y-1
                                hover:border-green-400
                                hover:bg-green-50
                                hover:shadow-md
                                dark:border-neutral-800
                                dark:bg-neutral-900
                                dark:text-white
                                dark:hover:bg-green-950/30
                              `
                          }
                        `}
                        data-testid={`zesa-amount-${val}`}
                      >
                        ${val}

                        {selected && (
                          <CheckCircle
                            size={14}
                            weight="fill"
                            className="
                              absolute
                              right-2
                              top-2
                              text-white/80
                            "
                          />
                        )}
                      </button>
                    );
                  })}
                </div>


                {/* Custom amount */}
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
                  className="
                    mt-3
                    w-full
                    rounded-2xl
                    border
                    border-neutral-200
                    bg-neutral-50
                    px-4
                    py-4
                    text-base
                    font-semibold
                    text-black
                    outline-none
                    transition-all
                    placeholder:text-neutral-400
                    focus:border-green-500
                    focus:bg-white
                    focus:ring-4
                    focus:ring-green-500/10
                    dark:border-neutral-800
                    dark:bg-neutral-900
                    dark:text-white
                    dark:placeholder:text-neutral-600
                    dark:focus:bg-neutral-950
                  "
                  data-testid="zesa-custom-amount-input"
                />

              </div>


              {/* =================================================== */}
              {/* ERROR */}
              {/* =================================================== */}

              {error && (
                <div
                  className="
                    mt-6
                    rounded-2xl
                    border
                    border-red-200
                    bg-red-50
                    px-4
                    py-3
                    text-sm
                    font-medium
                    text-red-600
                    dark:border-red-900/50
                    dark:bg-red-950/30
                    dark:text-red-400
                  "
                >
                  {error}
                </div>
              )}


              {/* =================================================== */}
              {/* SUBMIT */}
              {/* =================================================== */}

              <button
                type="submit"
                disabled={submitting}
                className="
                  mt-7
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2.5
                  rounded-2xl
                  bg-green-600
                  py-4
                  text-base
                  font-bold
                  text-white
                  shadow-xl
                  shadow-green-600/20
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:bg-green-700
                  hover:shadow-2xl
                  hover:shadow-green-600/25
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  disabled:hover:translate-y-0
                  md:py-5
                "
                data-testid="zesa-submit"
              >
                {submitting ? (
                  <>
                    <Spinner
                      size={20}
                      className="animate-spin"
                    />

                    Processing…
                  </>
                ) : (
                  <>
                    <Lightbulb
                      size={19}
                      weight="fill"
                    />

                    Buy token
                    {effectiveAmount
                      ? ` — $${effectiveAmount}`
                      : ""}
                  </>
                )}
              </button>

            </div>


            {/* =================================================== */}
            {/* SECURITY */}
            {/* =================================================== */}

            <div
              className="
                border-t
                border-neutral-100
                bg-neutral-50/70
                px-5
                py-4
                dark:border-neutral-900
                dark:bg-neutral-900/40
                md:px-8
              "
            >

              <div
                className="
                  flex
                  items-center
                  justify-center
                  gap-2
                  text-center
                "
              >

                <ShieldCheck
                  size={17}
                  weight="duotone"
                  className="text-green-600"
                />

                <p
                  className="
                    text-xs
                    font-medium
                    text-neutral-500
                    dark:text-neutral-400
                  "
                >
                  Your payment is securely processed through
                  Zimlink.
                </p>

              </div>

            </div>

          </form>
        )}


        {/* ========================================================= */}
        {/* ZIMLINK FOOTER */}
        {/* ========================================================= */}

        <div
          className="
            mt-6
            flex
            items-center
            justify-center
            gap-2
            opacity-60
          "
        >

          <img
            src={zimlinkLogo}
            alt="Zimlink"
            className="
              h-6
              w-auto
              object-contain
              dark:hidden
            "
          />

          <img
            src={zimlinkDarkLogo}
            alt="Zimlink"
            className="
              hidden
              h-6
              w-auto
              object-contain
              dark:block
            "
          />

          <span
            className="
              text-xs
              font-medium
              text-neutral-400
            "
          >
            Fast. Simple. Secure.
          </span>

        </div>

      </div>
    </div>
  );
}