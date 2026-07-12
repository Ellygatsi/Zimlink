import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowRight,
  Phone,
  Wallet,
  Storefront,
  ChatsCircle,
  CalendarStar,
} from "@phosphor-icons/react";
import HomeSlideshow from "@/components/HomeSlideshow";

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api
      .get("/stats/home")
      .then(({ data }) => setStats(data))
      .catch(() => {});
  }, []);

  return (
    <div
      className="min-h-screen space-y-4 bg-white text-black transition-colors duration-300 dark:bg-black dark:text-white md:space-y-6"
      data-testid="home-page"
    >
      {/* Greeting */}
      <div>
        <h1 className="mt-1 text-2xl font-medium tracking-tight text-black dark:text-white md:mt-2 md:text-6xl">
          Hey, {user?.name?.split(" ")[0] || "friend"}.
        </h1>

        <p className="mt-1.5 max-w-xl text-xs text-neutral-500 dark:text-neutral-400 md:mt-3 md:text-base">
          Stay connected to Home.
        </p>
      </div>

      {/* Wallet hero */}
      <Link
        to="/wallet"
        className="group relative block overflow-hidden rounded-xl bg-green-600 p-5 transition-transform hover:-translate-y-1 md:rounded-2xl md:p-8"
        data-testid="home-wallet-tile"
      >
        {/* Large faded background wallet */}
        <Wallet
          size={190}
          weight="duotone"
          className="pointer-events-none absolute -bottom-12 -right-8 text-black opacity-[0.12] transition-transform duration-300 group-hover:scale-105 md:-bottom-16 md:-right-10 md:h-[270px] md:w-[270px]"
        />

        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-black/70 md:text-xs">
              Wallet balance
            </p>

            <p className="mt-1.5 text-4xl font-medium tracking-tight text-black md:mt-3 md:text-7xl">
              ${(stats?.balance ?? 0).toFixed(2)}
            </p>

            <p className="mt-1.5 text-[11px] font-medium text-black/70 md:mt-3 md:text-sm">
              {stats?.tx_count ?? 0} transactions
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/10 md:h-14 md:w-14">
            <Wallet
              size={25}
              weight="bold"
              className="text-black md:hidden"
            />

            <Wallet
              size={32}
              weight="bold"
              className="hidden text-black md:block"
            />
          </div>
        </div>

        <div className="relative z-10 mt-5 inline-flex items-center gap-1.5 rounded-full bg-black/10 px-3 py-1.5 text-[11px] font-medium text-black md:mt-8 md:px-4 md:py-2 md:text-sm">
          View wallet
          <ArrowRight size={14} weight="bold" />
        </div>
      </Link>

      {/* Quick actions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400 md:text-xs">
            Quick access
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4">
          {/* Calls */}
          <Link
            to="/calls"
            className="group relative min-h-[145px] overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 p-4 transition-all hover:-translate-y-1 hover:border-green-500 dark:border-neutral-800 dark:bg-neutral-900 md:min-h-[190px] md:rounded-2xl md:p-6"
            data-testid="home-calls-tile"
          >
            <Phone
              size={110}
              weight="duotone"
              className="pointer-events-none absolute -bottom-7 -right-7 text-green-600 opacity-[0.10] transition-transform duration-300 group-hover:scale-110 dark:text-green-500 dark:opacity-[0.14] md:h-[150px] md:w-[150px]"
            />

            <div className="relative z-10">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/50 md:h-14 md:w-14">
                <Phone
                  size={23}
                  weight="fill"
                  className="text-green-600 md:hidden"
                />

                <Phone
                  size={30}
                  weight="fill"
                  className="hidden text-green-600 md:block"
                />
              </div>

              <p className="mt-4 text-[10px] font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400 md:text-xs">
                Calls
              </p>

              <p className="mt-1 text-2xl font-medium text-black dark:text-white md:text-4xl">
                {stats?.call_count ?? 0}
              </p>

              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400 md:text-xs">
                Call Zimbabwe
              </p>
            </div>
          </Link>

          {/* Community */}
          <Link
            to="/community"
            className="group relative min-h-[145px] overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 p-4 transition-all hover:-translate-y-1 hover:border-green-500 dark:border-neutral-800 dark:bg-neutral-900 md:min-h-[190px] md:rounded-2xl md:p-6"
            data-testid="home-community-tile"
          >
            <ChatsCircle
              size={115}
              weight="duotone"
              className="pointer-events-none absolute -bottom-8 -right-7 text-green-600 opacity-[0.10] transition-transform duration-300 group-hover:scale-110 dark:text-green-500 dark:opacity-[0.14] md:h-[155px] md:w-[155px]"
            />

            <div className="relative z-10">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/50 md:h-14 md:w-14">
                <ChatsCircle
                  size={24}
                  weight="fill"
                  className="text-green-600 md:hidden"
                />

                <ChatsCircle
                  size={31}
                  weight="fill"
                  className="hidden text-green-600 md:block"
                />
              </div>

              <p className="mt-4 text-[10px] font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400 md:text-xs">
                Community
              </p>

              <p className="mt-1 text-2xl font-medium text-black dark:text-white md:text-4xl">
                {stats?.post_count ?? 0}
              </p>

              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400 md:text-xs">
                Recent posts
              </p>
            </div>
          </Link>

          {/* Marketplace */}
          <Link
            to="/marketplace"
            className="group relative min-h-[145px] overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 p-4 transition-all hover:-translate-y-1 hover:border-green-500 dark:border-neutral-800 dark:bg-neutral-900 md:min-h-[190px] md:rounded-2xl md:p-6"
            data-testid="home-marketplace-tile"
          >
            <Storefront
              size={115}
              weight="duotone"
              className="pointer-events-none absolute -bottom-8 -right-7 text-green-600 opacity-[0.10] transition-transform duration-300 group-hover:scale-110 dark:text-green-500 dark:opacity-[0.14] md:h-[155px] md:w-[155px]"
            />

            <div className="relative z-10">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/50 md:h-14 md:w-14">
                <Storefront
                  size={23}
                  weight="fill"
                  className="text-green-600 md:hidden"
                />

                <Storefront
                  size={30}
                  weight="fill"
                  className="hidden text-green-600 md:block"
                />
              </div>

              <p className="mt-4 text-[10px] font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400 md:text-xs">
                Marketplace
              </p>

              <p className="mt-1 text-xl font-medium text-black dark:text-white md:text-3xl">
                {stats?.listing_count ?? 0}
              </p>

              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400 md:text-xs">
                Active listings
              </p>
            </div>
          </Link>

          {/* Events */}
          <Link
            to="/events"
            className="group relative min-h-[145px] overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 p-4 transition-all hover:-translate-y-1 hover:border-green-500 dark:border-neutral-800 dark:bg-neutral-900 md:min-h-[190px] md:rounded-2xl md:p-6"
            data-testid="home-events-tile"
          >
            <CalendarStar
              size={115}
              weight="duotone"
              className="pointer-events-none absolute -bottom-8 -right-7 text-green-600 opacity-[0.10] transition-transform duration-300 group-hover:scale-110 dark:text-green-500 dark:opacity-[0.14] md:h-[155px] md:w-[155px]"
            />

            <div className="relative z-10">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/50 md:h-14 md:w-14">
                <CalendarStar
                  size={23}
                  weight="fill"
                  className="text-green-600 md:hidden"
                />

                <CalendarStar
                  size={30}
                  weight="fill"
                  className="hidden text-green-600 md:block"
                />
              </div>

              <p className="mt-4 text-[10px] font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400 md:text-xs">
                Events
              </p>

              <p className="mt-1 text-xl font-medium text-black dark:text-white md:text-3xl">
                Explore
              </p>

              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400 md:text-xs">
                Zimbabwean events
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Latest listing */}
      {stats?.recent_listing && (
        <Link
          to={`/marketplace/${stats.recent_listing.id}`}
          className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-3 transition-colors hover:border-green-500 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
              Latest listing
            </p>

            <p className="mt-1 text-sm font-medium text-black dark:text-white">
              {stats.recent_listing.title}
            </p>
          </div>

          <ArrowRight
            size={18}
            weight="bold"
            className="text-green-600"
          />
        </Link>
      )}

      {/* Zimbabwe slideshow */}
      <div>
        <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-green-600 md:text-xs">
          Discover Zimbabwe
        </p>

        <HomeSlideshow />
      </div>
    </div>
  );
}