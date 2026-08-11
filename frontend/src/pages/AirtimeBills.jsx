import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Lightning, Receipt } from "@phosphor-icons/react";

const AIRTIME_PROVIDERS = [
  {
    slug: "econet",
    name: "Econet",
    tagline: "Airtime & bundles",
    logo: "/logos/econet.png",
    color: "bg-red-50 dark:bg-red-950/30",
    initials: "EC",
    initialsColor: "text-red-600",
  },
  {
    slug: "netone",
    name: "NetOne",
    tagline: "Airtime & bundles",
    logo: "/logos/netone.png",
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
    logo: "/logos/zesa.png",
    color: "bg-amber-50 dark:bg-amber-950/30",
    initials: "ZE",
    initialsColor: "text-amber-600",
  },
];

function ProviderLogo({ logo, name, initials, initialsColor, color }) {
  const [failed, setFailed] = useState(false);

  if (failed || !logo) {
    return (
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full ${color} md:h-16 md:w-16`}
      >
        <span className={`text-sm font-semibold ${initialsColor} md:text-base`}>
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full ${color} md:h-16 md:w-16`}
    >
      <img
        src={logo}
        alt={name}
        className="h-9 w-9 object-contain md:h-10 md:w-10"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function ProviderCard({ to, name, tagline, logo, color, initials, initialsColor, testId }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-100 p-4 transition-all hover:-translate-y-1 hover:border-green-500 dark:border-neutral-800 dark:bg-neutral-900 md:rounded-2xl md:p-6"
      data-testid={testId}
    >
      <div className="flex items-center gap-3.5 md:gap-4">
        <ProviderLogo
          logo={logo}
          name={name}
          initials={initials}
          initialsColor={initialsColor}
          color={color}
        />

        <div>
          <p className="text-sm font-medium text-black dark:text-white md:text-base">
            {name}
          </p>

          <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400 md:text-xs">
            {tagline}
          </p>
        </div>
      </div>

      <ArrowRight
        size={18}
        weight="bold"
        className="text-neutral-400 transition-transform group-hover:translate-x-1 group-hover:text-green-600 dark:text-neutral-600"
      />
    </Link>
  );
}

export default function AirtimeBills() {
  return (
    <div
      className="min-h-screen space-y-6 bg-white text-black transition-colors duration-300 dark:bg-black dark:text-white md:space-y-8"
      data-testid="airtime-bills-page"
    >
      {/* Header */}
      <div>
        <Link
          to="/"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-green-600 dark:text-neutral-400 md:mb-4 md:text-sm"
        >
          <ArrowLeft size={15} weight="bold" />
          Back to Home
        </Link>

        <h1 className="text-2xl font-medium tracking-tight text-black dark:text-white md:text-5xl">
          Airtime & Bills
        </h1>

        <p className="mt-1.5 max-w-xl text-xs text-neutral-500 dark:text-neutral-400 md:mt-3 md:text-base">
          Top up a phone or pay a bill back home, instantly.
        </p>
      </div>

      {/* Airtime section */}
      <div>
        <div className="mb-3 flex items-center gap-2 md:mb-4">
          <Lightning size={16} weight="fill" className="text-green-600" />
          <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400 md:text-xs">
            Airtime
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:gap-4">
          {AIRTIME_PROVIDERS.map((p) => (
            <ProviderCard
              key={p.slug}
              to={`/airtime/${p.slug}`}
              testId={`airtime-provider-${p.slug}`}
              {...p}
            />
          ))}
        </div>
      </div>

      {/* Bill payments section */}
      <div>
        <div className="mb-3 flex items-center gap-2 md:mb-4">
          <Receipt size={16} weight="fill" className="text-green-600" />
          <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400 md:text-xs">
            Bill payments
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:gap-4">
          {BILL_PROVIDERS.map((p) => (
            <ProviderCard
              key={p.slug}
              to={`/airtime/${p.slug}`}
              testId={`bill-provider-${p.slug}`}
              {...p}
            />
          ))}
        </div>
      </div>

      {/* Powered by note */}
      <p className="text-center text-[10px] text-neutral-400 dark:text-neutral-600 md:text-xs">
        Payments processed securely via Reloadly
      </p>
    </div>
  );
}