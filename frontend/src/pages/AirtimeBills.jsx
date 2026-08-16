import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Lightning, Receipt, CheckCircle } from "@phosphor-icons/react";

import econetLogo from "@/Assets/econet.png";
import netoneLogo from "@/Assets/netone.png";
import zetdcLogo from "@/Assets/Zetdc.png";

const AIRTIME_PROVIDERS = [
  {
    slug: "econet",
    name: "Econet",
    tagline: "Airtime & bundles",
    logo: econetLogo,
    initials: "EC",
    initialsColor: "text-red-600",
  },
  {
    slug: "netone",
    name: "NetOne",
    tagline: "Airtime & bundles",
    logo: netoneLogo,
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
    initials: "ZE",
    initialsColor: "text-amber-600",
  },
];

function ProviderLogo({ logo, name, initials, initialsColor }) {
  const [failed, setFailed] = useState(false);

  if (failed || !logo) {
    return (
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800">
        <span className={`text-sm font-medium ${initialsColor}`}>{initials}</span>
      </div>
    );
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white p-2 dark:bg-neutral-950">
      <img
        src={logo}
        alt={`${name} logo`}
        className="h-full w-full object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function ProviderRow({ to, name, tagline, logo, initials, initialsColor, testId }) {
  return (
    <Link
      to={to}
      className="rounded-xl p-4 flex items-center justify-between bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 transition-colors hover:border-green-500"
      data-testid={testId}
    >
      <div className="flex items-center gap-3.5">
        <ProviderLogo logo={logo} name={name} initials={initials} initialsColor={initialsColor} />

        <div>
          <p className="font-medium text-sm text-black dark:text-white">{name}</p>
          <p className="text-xs text-neutral-500 mt-0.5">{tagline}</p>
        </div>
      </div>

      <ArrowRight size={18} weight="bold" className="text-green-600" />
    </Link>
  );
}

export default function AirtimeBills() {
  return (
    <div className="space-y-5 md:space-y-6" data-testid="airtime-bills-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <p className="text-[10px] md:text-xs font-medium tracking-widest text-green-500 uppercase">
            Airtime & Bills
          </p>
          <h1 className="text-3xl md:text-6xl font-medium tracking-tight mt-1.5 md:mt-2 text-black dark:text-white">
            Top up.
          </h1>
          <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 md:mt-2">
            Send airtime or pay a bill back home, instantly.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium w-fit bg-green-600 text-black">
          <CheckCircle size={14} weight="bold" />
          Reloadly
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Lightning size={15} weight="fill" className="text-green-600" />
          <p className="text-[10px] md:text-xs font-medium tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">
            Airtime
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3">
          {AIRTIME_PROVIDERS.map((p) => (
            <ProviderRow key={p.slug} to={`/airtime/${p.slug}`} testId={`airtime-provider-${p.slug}`} {...p} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Receipt size={15} weight="fill" className="text-green-600" />
          <p className="text-[10px] md:text-xs font-medium tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">
            Bill payments
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3">
          {BILL_PROVIDERS.map((p) => (
            <ProviderRow key={p.slug} to={`/airtime/${p.slug}`} testId={`bill-provider-${p.slug}`} {...p} />
          ))}
        </div>
      </div>
    </div>
  );
}
