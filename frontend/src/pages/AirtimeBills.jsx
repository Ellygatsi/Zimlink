import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Lightning,
  Receipt,
  ShieldCheck,
  CheckCircle,
} from "@phosphor-icons/react";

// Logos from src/Assets
import econetLogo from "@/Assets/econet.png";
import netoneLogo from "@/Assets/netone.png";
import zetdcLogo from "@/Assets/Zetdc.png";
import zimlinkLogo from "@/Assets/logo.png";
import zimlinkDarkLogo from "@/Assets/logo-dark.png";

const AIRTIME_PROVIDERS = [
  {
    slug: "econet",
    name: "Econet",
    tagline: "Airtime & bundles",
    logo: econetLogo,
    color: "bg-red-50 dark:bg-red-950/30",
    initials: "EC",
    initialsColor: "text-red-600",
  },
  {
    slug: "netone",
    name: "NetOne",
    tagline: "Airtime & bundles",
    logo: netoneLogo,
    color: "bg-blue-50 dark:bg-blue-950/30",
    initials: "NO",
    initialsColor: "text-blue-600",
  },
];

const BILL_PROVIDERS = [
  {
    slug: "zesa",
    name: "ZESA / ZETDC",
    tagline: "Buy electricity tokens",
    logo: zetdcLogo,
    color: "bg-amber-50 dark:bg-amber-950/30",
    initials: "ZE",
    initialsColor: "text-amber-600",
  },
];

function ProviderLogo({
  logo,
  name,
  initials,
  initialsColor,
  color,
}) {
  const [failed, setFailed] = useState(false);

  if (failed || !logo) {
    return (
      <div
        className={`
          flex
          h-16
          w-16
          shrink-0
          items-center
          justify-center
          rounded-2xl
          ${color}
          md:h-20
          md:w-20
        `}
      >
        <span
          className={`
            text-base
            font-black
            ${initialsColor}
            md:text-lg
          `}
        >
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`
        flex
        h-16
        w-16
        shrink-0
        items-center
        justify-center
        overflow-hidden
        rounded-2xl
        border
        border-neutral-100
        bg-white
        p-2.5
        shadow-sm
        dark:border-neutral-800
        dark:bg-neutral-950
        md:h-20
        md:w-20
        md:p-3
      `}
    >
      <img
        src={logo}
        alt={`${name} logo`}
        className="
          h-full
          w-full
          object-contain
        "
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function ProviderCard({
  to,
  name,
  tagline,
  logo,
  color,
  initials,
  initialsColor,
  testId,
}) {
  return (
    <Link
      to={to}
      className="
        group
        relative
        flex
        items-center
        justify-between
        overflow-hidden
        rounded-3xl
        border
        border-neutral-200
        bg-white
        p-4
        shadow-sm
        transition-all
        duration-200
        hover:-translate-y-1
        hover:border-green-400
        hover:shadow-xl
        hover:shadow-green-600/10
        dark:border-neutral-800
        dark:bg-neutral-950
        dark:hover:border-green-800
        md:p-5
      "
      data-testid={testId}
    >
      {/* Decorative glow */}
      <div
        className="
          pointer-events-none
          absolute
          -right-12
          -top-12
          h-32
          w-32
          rounded-full
          bg-green-500/5
          blur-2xl
          transition-all
          duration-300
          group-hover:bg-green-500/10
        "
      />

      <div className="relative flex min-w-0 items-center gap-4">

        <ProviderLogo
          logo={logo}
          name={name}
          initials={initials}
          initialsColor={initialsColor}
          color={color}
        />

        <div className="min-w-0">

          <p
            className="
              truncate
              text-base
              font-bold
              text-neutral-950
              dark:text-white
              md:text-lg
            "
          >
            {name}
          </p>

          <p
            className="
              mt-1
              text-xs
              font-medium
              text-neutral-500
              dark:text-neutral-400
              md:text-sm
            "
          >
            {tagline}
          </p>

          <div className="mt-2.5 flex items-center gap-1.5">

            <CheckCircle
              size={14}
              weight="fill"
              className="text-green-600"
            />

            <span
              className="
                text-[10px]
                font-semibold
                text-green-600
                md:text-xs
              "
            >
              Available
            </span>

          </div>
        </div>
      </div>

      {/* Arrow */}
      <div
        className="
          relative
          ml-3
          flex
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          rounded-xl
          bg-neutral-100
          transition-all
          duration-200
          group-hover:bg-green-600
          dark:bg-neutral-900
          dark:group-hover:bg-green-600
        "
      >
        <ArrowRight
          size={17}
          weight="bold"
          className="
            text-neutral-400
            transition-all
            duration-200
            group-hover:translate-x-0.5
            group-hover:text-white
            dark:text-neutral-500
          "
        />
      </div>
    </Link>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}) {
  return (
    <div className="mb-4 md:mb-5">

      <div className="flex items-center gap-2.5">

        <div
          className="
            flex
            h-8
            w-8
            items-center
            justify-center
            rounded-xl
            bg-green-50
            text-green-600
            dark:bg-green-950/40
            dark:text-green-400
          "
        >
          {icon}
        </div>

        <div>
          <p
            className="
              text-xs
              font-bold
              uppercase
              tracking-[0.15em]
              text-neutral-700
              dark:text-neutral-300
            "
          >
            {title}
          </p>

          <p
            className="
              mt-0.5
              text-[11px]
              text-neutral-400
              md:text-xs
            "
          >
            {description}
          </p>
        </div>

      </div>
    </div>
  );
}

export default function AirtimeBills() {
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
      data-testid="airtime-bills-page"
    >
      <div className="mx-auto max-w-3xl">

        {/* ========================================================= */}
        {/* HEADER */}
        {/* ========================================================= */}

        <div
          className="
            relative
            mb-8
            overflow-hidden
            rounded-[2rem]
            border
            border-neutral-200
            bg-white
            p-6
            shadow-lg
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
              -top-24
              h-64
              w-64
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

            {/* Back */}
            <Link
              to="/"
              className="
                mb-6
                inline-flex
                items-center
                gap-2
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
                size={16}
                weight="bold"
              />

              Back to Home
            </Link>


            {/* Brand */}
            <div className="mb-5 flex items-center gap-2">

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
                Zimlink
              </span>

            </div>


            <h1
              className="
                text-3xl
                font-black
                tracking-tight
                text-neutral-950
                dark:text-white
                md:text-5xl
              "
            >
              Airtime & Bills
            </h1>

            <p
              className="
                mt-2
                max-w-xl
                text-sm
                leading-6
                text-neutral-500
                dark:text-neutral-400
                md:mt-3
                md:text-base
              "
            >
              Top up a phone or pay a bill back home,
              instantly and securely.
            </p>


            {/* Trust badges */}
            <div className="mt-5 flex flex-wrap gap-2">

              <div
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-full
                  bg-green-50
                  px-3
                  py-1.5
                  text-xs
                  font-semibold
                  text-green-700
                  dark:bg-green-950/40
                  dark:text-green-400
                "
              >
                <ShieldCheck
                  size={14}
                  weight="fill"
                />

                Secure payments
              </div>

              <div
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-full
                  bg-neutral-100
                  px-3
                  py-1.5
                  text-xs
                  font-semibold
                  text-neutral-600
                  dark:bg-neutral-900
                  dark:text-neutral-400
                "
              >
                <Lightning
                  size={14}
                  weight="fill"
                  className="text-green-600"
                />

                Instant delivery
              </div>

            </div>

          </div>
        </div>


        {/* ========================================================= */}
        {/* AIRTIME */}
        {/* ========================================================= */}

        <section className="mb-8">

          <SectionHeader
            title="Airtime"
            description="Choose a mobile network"
            icon={
              <Lightning
                size={17}
                weight="fill"
              />
            }
          />

          <div
            className="
              grid
              grid-cols-1
              gap-3
              sm:grid-cols-2
              md:gap-4
            "
          >
            {AIRTIME_PROVIDERS.map((p) => (
              <ProviderCard
                key={p.slug}
                to={`/airtime/${p.slug}`}
                testId={`airtime-provider-${p.slug}`}
                {...p}
              />
            ))}
          </div>

        </section>


        {/* ========================================================= */}
        {/* BILL PAYMENTS */}
        {/* ========================================================= */}

        <section className="mb-8">

          <SectionHeader
            title="Bill payments"
            description="Pay essential bills from anywhere"
            icon={
              <Receipt
                size={17}
                weight="fill"
              />
            }
          />

          <div
            className="
              grid
              grid-cols-1
              gap-3
              sm:grid-cols-2
              md:gap-4
            "
          >
            {BILL_PROVIDERS.map((p) => (
              <ProviderCard
                key={p.slug}
                to={`/airtime/${p.slug}`}
                testId={`bill-provider-${p.slug}`}
                {...p}
              />
            ))}
          </div>

        </section>


        {/* ========================================================= */}
        {/* FOOTER */}
        {/* ========================================================= */}

        <div
          className="
            flex
            flex-col
            items-center
            justify-center
            gap-3
            border-t
            border-neutral-200
            pt-6
            dark:border-neutral-900
          "
        >

          <div className="flex items-center gap-2">

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
                font-semibold
                text-neutral-400
              "
            >
              Fast. Simple. Secure.
            </span>

          </div>

          <div
            className="
              flex
              items-center
              gap-1.5
              text-center
              text-[10px]
              text-neutral-400
              dark:text-neutral-600
              md:text-xs
            "
          >
            <ShieldCheck
              size={14}
              weight="duotone"
              className="text-green-600"
            />

            Payments processed securely via Reloadly
          </div>

        </div>

      </div>
    </div>
  );
}