import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import {
  ArrowLeft,
  Phone,
  WifiHigh,
  CheckCircle,
  Spinner,
  Lightning,
  ShieldCheck,
} from "@phosphor-icons/react";

// Logos from src/Assets
import econetLogo from "@/Assets/econet.png";
import netoneLogo from "@/Assets/netone.png";
import zetdcLogo from "@/Assets/Zetdc.png";
import zimlinkLogo from "@/Assets/logo.png";
import zimlinkDarkLogo from "@/Assets/logo-dark.png";

const QUICK_AMOUNTS = [2, 5, 10, 20, 50];

// Automatically select the correct image for each provider.
// Adjust the keys below if your actual slugs are different.
const PROVIDER_LOGOS = {
  econet: econetLogo,
  netone: netoneLogo,
  zetdc: zetdcLogo,
};

export default function AirtimeProviderPage({
  slug,
  name,
  color = "bg-neutral-100",
  initials = "",
  initialsColor = "text-neutral-700",
  logo,
}) {
  const [tab, setTab] = useState("airtime");

  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");

  const [bundles, setBundles] = useState(null);
  const [selectedBundle, setSelectedBundle] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  /*
   * Use the supplied logo first.
   * Otherwise automatically use the appropriate logo from src/Assets.
   */
  const providerLogo =
    logo ||
    PROVIDER_LOGOS[slug?.toLowerCase()] ||
    null;

  useEffect(() => {
    if (tab !== "bundles" || bundles) return;

    api
      .get(`/reloadly/operators/${slug}/bundles`)
      .then(({ data }) => setBundles(data))
      .catch(() => setBundles([]));
  }, [tab, slug, bundles]);

  const effectiveAmount = customAmount
    ? Number(customAmount)
    : amount;

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
          ? {
              operator: slug,
              phone,
              amount: effectiveAmount,
              type: "airtime",
            }
          : {
              operator: slug,
              phone,
              bundleId: selectedBundle.id,
              type: "bundle",
            };

      const { data } = await api.post(
        "/reloadly/topup",
        payload
      );

      setSuccess(
        data?.message || "Top-up sent successfully."
      );

      setPhone("");
      setAmount(null);
      setCustomAmount("");
      setSelectedBundle(null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
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
      data-testid={`${slug}-page`}
    >
      <div className="mx-auto max-w-3xl">

        {/* ========================================================= */}
        {/* BACK BUTTON */}
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
        {/* PROVIDER HEADER */}
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

          {/* Decorative background */}
          <div
            className="
              pointer-events-none
              absolute
              -right-20
              -top-20
              h-56
              w-56
              rounded-full
              bg-green-500/10
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
              bg-emerald-400/10
              blur-3xl
            "
          />

          <div className="relative">

            {/* Small brand label */}
            <div className="mb-6 flex items-center gap-2">
              <div
                className="
                  flex
                  h-7
                  w-7
                  items-center
                  justify-center
                  rounded-lg
                  bg-green-600
                  text-white
                "
              >
                <Lightning
                  size={15}
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
                Zimlink Airtime
              </span>
            </div>


            {/* Provider information */}
            <div className="flex items-center gap-5">

              {/* LOGO */}
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
                {providerLogo ? (
                  <img
                    src={providerLogo}
                    alt={`${name} logo`}
                    className="
                      h-full
                      w-full
                      object-contain
                    "
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <span
                    className={`
                      text-xl
                      font-black
                      ${initialsColor}
                    `}
                  >
                    {initials}
                  </span>
                )}
              </div>


              {/* Name */}
              <div className="min-w-0">

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
                  {name}
                </h1>

                <p
                  className="
                    mt-1.5
                    text-sm
                    text-neutral-500
                    dark:text-neutral-400
                  "
                >
                  Send airtime and bundles instantly
                </p>

                <div className="mt-3 flex items-center gap-2">
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
        {/* MAIN CARD */}
        {/* ========================================================= */}

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

            {/* ===================================================== */}
            {/* TABS */}
            {/* ===================================================== */}

            <div
              className="
                mb-8
                flex
                rounded-2xl
                bg-neutral-100
                p-1.5
                dark:bg-neutral-900
              "
            >

              <button
                type="button"
                onClick={() => {
                  setTab("airtime");
                  setError(null);
                  setSuccess(null);
                }}
                className={`
                  flex
                  flex-1
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  px-4
                  py-3
                  text-sm
                  font-bold
                  transition-all
                  ${
                    tab === "airtime"
                      ? `
                        bg-white
                        text-green-600
                        shadow-md
                        shadow-neutral-200/70
                        dark:bg-neutral-800
                        dark:text-green-400
                      `
                      : `
                        text-neutral-500
                        hover:text-neutral-900
                        dark:text-neutral-400
                        dark:hover:text-white
                      `
                  }
                `}
                data-testid={`${slug}-tab-airtime`}
              >
                <Phone
                  size={18}
                  weight="fill"
                />

                Airtime
              </button>


              <button
                type="button"
                onClick={() => {
                  setTab("bundles");
                  setError(null);
                  setSuccess(null);
                }}
                className={`
                  flex
                  flex-1
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  px-4
                  py-3
                  text-sm
                  font-bold
                  transition-all
                  ${
                    tab === "bundles"
                      ? `
                        bg-white
                        text-green-600
                        shadow-md
                        shadow-neutral-200/70
                        dark:bg-neutral-800
                        dark:text-green-400
                      `
                      : `
                        text-neutral-500
                        hover:text-neutral-900
                        dark:text-neutral-400
                        dark:hover:text-white
                      `
                  }
                `}
                data-testid={`${slug}-tab-bundles`}
              >
                <WifiHigh
                  size={18}
                  weight="fill"
                />

                Bundles
              </button>
            </div>


            {/* ===================================================== */}
            {/* PHONE NUMBER */}
            {/* ===================================================== */}

            <div className="mb-8">

              <div className="mb-2.5 flex items-center justify-between">

                <label
                  htmlFor="phone"
                  className="
                    text-xs
                    font-bold
                    uppercase
                    tracking-[0.15em]
                    text-neutral-500
                    dark:text-neutral-400
                  "
                >
                  Recipient's phone number
                </label>

                <span
                  className="
                    rounded-full
                    bg-neutral-100
                    px-2.5
                    py-1
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-wider
                    text-neutral-500
                    dark:bg-neutral-900
                    dark:text-neutral-500
                  "
                >
                  Zimbabwe
                </span>

              </div>

              <div className="relative">

                <Phone
                  size={20}
                  weight="duotone"
                  className="
                    pointer-events-none
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-neutral-400
                  "
                />

                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="077 123 4567"
                  className="
                    w-full
                    rounded-2xl
                    border
                    border-neutral-200
                    bg-neutral-50
                    py-4
                    pl-12
                    pr-4
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
                  data-testid={`${slug}-phone-input`}
                />

              </div>
            </div>


            {/* ===================================================== */}
            {/* AIRTIME */}
            {/* ===================================================== */}

            {tab === "airtime" ? (
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
                      Choose a quick amount or enter your own
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
                          group
                          relative
                          overflow-hidden
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
                        data-testid={`${slug}-amount-${val}`}
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
                <div className="relative mt-3">

                  <span
                    className="
                      pointer-events-none
                      absolute
                      left-4
                      top-1/2
                      -translate-y-1/2
                      text-base
                      font-bold
                      text-neutral-400
                    "
                  >
                    $
                  </span>

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
                    placeholder="Enter a custom amount"
                    className="
                      w-full
                      rounded-2xl
                      border
                      border-neutral-200
                      bg-neutral-50
                      py-4
                      pl-9
                      pr-4
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
                    data-testid={`${slug}-custom-amount-input`}
                  />

                </div>
              </div>
            ) : (

              /* =================================================== */
              /* BUNDLES */
              /* =================================================== */

              <div>

                <div className="mb-4">

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
                    Choose a bundle
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-neutral-400
                    "
                  >
                    Select the data bundle you want to send
                  </p>

                </div>


                {/* Loading */}
                {bundles === null && (
                  <div
                    className="
                      flex
                      items-center
                      justify-center
                      gap-3
                      rounded-2xl
                      border
                      border-neutral-200
                      bg-neutral-50
                      py-12
                      text-sm
                      text-neutral-500
                      dark:border-neutral-800
                      dark:bg-neutral-900
                      dark:text-neutral-400
                    "
                  >
                    <Spinner
                      size={20}
                      className="animate-spin"
                    />

                    Loading bundles…
                  </div>
                )}


                {/* Empty */}
                {bundles?.length === 0 && (
                  <div
                    className="
                      rounded-2xl
                      border
                      border-dashed
                      border-neutral-300
                      bg-neutral-50
                      px-5
                      py-12
                      text-center
                      dark:border-neutral-800
                      dark:bg-neutral-900
                    "
                  >
                    <WifiHigh
                      size={32}
                      className="
                        mx-auto
                        mb-3
                        text-neutral-400
                      "
                    />

                    <p
                      className="
                        text-sm
                        font-semibold
                        text-neutral-700
                        dark:text-neutral-300
                      "
                    >
                      No bundles available right now.
                    </p>

                    <p
                      className="
                        mt-1
                        text-xs
                        text-neutral-500
                      "
                    >
                      Please check back later.
                    </p>
                  </div>
                )}


                {/* Bundle list */}
                {bundles &&
                  bundles.length > 0 && (
                    <div
                      className="
                        grid
                        grid-cols-1
                        gap-3
                        sm:grid-cols-2
                      "
                    >
                      {bundles.map((b) => {

                        const selected =
                          selectedBundle?.id === b.id;

                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              setSelectedBundle(b);
                              setError(null);
                            }}
                            className={`
                              rounded-2xl
                              border
                              p-5
                              text-left
                              transition-all
                              duration-200
                              ${
                                selected
                                  ? `
                                    border-green-500
                                    bg-green-50
                                    shadow-lg
                                    shadow-green-500/10
                                    dark:bg-green-950/30
                                  `
                                  : `
                                    border-neutral-200
                                    bg-neutral-50
                                    hover:-translate-y-1
                                    hover:border-green-400
                                    hover:bg-green-50/50
                                    hover:shadow-md
                                    dark:border-neutral-800
                                    dark:bg-neutral-900
                                    dark:hover:bg-green-950/20
                                  `
                              }
                            `}
                            data-testid={`${slug}-bundle-${b.id}`}
                          >

                            <div
                              className="
                                flex
                                items-start
                                justify-between
                                gap-3
                              "
                            >

                              <div>

                                <p
                                  className="
                                    text-sm
                                    font-bold
                                    text-black
                                    dark:text-white
                                    md:text-base
                                  "
                                >
                                  {b.name}
                                </p>

                                <p
                                  className="
                                    mt-1
                                    text-xs
                                    text-neutral-500
                                    dark:text-neutral-400
                                  "
                                >
                                  {b.validity}
                                </p>

                              </div>

                              {selected && (
                                <CheckCircle
                                  size={22}
                                  weight="fill"
                                  className="
                                    shrink-0
                                    text-green-600
                                  "
                                />
                              )}

                            </div>

                            <div
                              className="
                                mt-5
                                flex
                                items-end
                                justify-between
                              "
                            >

                              <span
                                className="
                                  text-xl
                                  font-black
                                  text-green-600
                                "
                              >
                                ${b.price}
                              </span>

                              {selected && (
                                <span
                                  className="
                                    text-[10px]
                                    font-bold
                                    uppercase
                                    tracking-wider
                                    text-green-600
                                  "
                                >
                                  Selected
                                </span>
                              )}

                            </div>

                          </button>
                        );
                      })}
                    </div>
                  )}
              </div>
            )}


            {/* ===================================================== */}
            {/* ERROR */}
            {/* ===================================================== */}

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


            {/* ===================================================== */}
            {/* SUCCESS */}
            {/* ===================================================== */}

            {success && (
              <div
                className="
                  mt-6
                  flex
                  items-start
                  gap-3
                  rounded-2xl
                  border
                  border-green-200
                  bg-green-50
                  px-4
                  py-4
                  text-sm
                  font-medium
                  text-green-700
                  dark:border-green-900/50
                  dark:bg-green-950/30
                  dark:text-green-400
                "
              >
                <CheckCircle
                  size={21}
                  weight="fill"
                  className="mt-0.5 shrink-0"
                />

                <span>{success}</span>
              </div>
            )}


            {/* ===================================================== */}
            {/* SUBMIT */}
            {/* ===================================================== */}

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
                  <Lightning
                    size={19}
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
                    size={19}
                    weight="fill"
                  />

                  Buy bundle
                </>
              )}
            </button>

          </div>


          {/* ======================================================= */}
          {/* SECURITY FOOTER */}
          {/* ======================================================= */}

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
                Your transaction is securely processed through Zimlink.
              </p>

            </div>

          </div>

        </form>


        {/* ========================================================= */}
        {/* BRAND FOOTER */}
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