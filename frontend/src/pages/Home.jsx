import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, Phone, Wallet, Storefront, ChatsCircle, CalendarStar } from "@phosphor-icons/react";
import HomeSlideshow from "@/components/HomeSlideshow";

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/stats/home").then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-4 md:space-y-6 bg-black min-h-screen" data-testid="home-page">
      <div>
        <h1 className="text-2xl md:text-6xl font-medium tracking-tight mt-1 md:mt-2 text-white">
          Hey, {user?.name?.split(" ")[0] || "friend"}.
        </h1>
        <p className="text-xs md:text-base text-neutral-400 mt-1.5 md:mt-3 max-w-xl">
          Stay connected to Home.
        </p>
      </div>

      {/* Wallet — full width hero */}
      <Link
        to="/wallet"
        className="block rounded-xl md:rounded-2xl p-4 md:p-6 bg-green-600 transition-transform hover:-translate-y-1"
        data-testid="home-wallet-tile"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] md:text-xs font-medium tracking-widest text-black/70 uppercase">Wallet balance</p>
            <p className="text-3xl md:text-7xl font-medium tracking-tight mt-1.5 md:mt-3 text-black">
              ${(stats?.balance ?? 0).toFixed(2)}
            </p>
            <p className="text-[11px] md:text-sm mt-1.5 md:mt-3 font-medium text-black/70">{stats?.tx_count ?? 0} transactions</p>
          </div>
          <Wallet size={20} weight="bold" className="text-black md:hidden" />
          <Wallet size={36} weight="bold" className="text-black hidden md:block" />
        </div>
        <div className="mt-3 md:mt-8 inline-flex items-center gap-1.5 font-medium text-black bg-black/10 rounded-full px-3 py-1 md:px-4 md:py-2 text-[11px] md:text-sm">
          Send & receive <ArrowRight size={12} weight="bold" />
        </div>
      </Link>

      {/* Quick action grid — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4">
        <Link
          to="/calls"
          className="rounded-xl md:rounded-2xl p-3 md:p-6 bg-neutral-900 border border-neutral-800 transition-transform hover:-translate-y-1"
          data-testid="home-calls-tile"
        >
          <Phone size={16} weight="bold" className="text-green-500 md:hidden" />
          <Phone size={28} weight="bold" className="text-green-500 hidden md:block" />
          <p className="text-[9px] md:text-xs font-medium tracking-widest text-neutral-500 uppercase mt-2 md:mt-4">Calls</p>
          <p className="text-lg md:text-3xl font-medium mt-0.5 text-white">{stats?.call_count ?? 0}</p>
        </Link>

        <Link
          to="/community"
          className="rounded-xl md:rounded-2xl p-3 md:p-6 bg-neutral-900 border border-neutral-800 transition-transform hover:-translate-y-1"
          data-testid="home-community-tile"
        >
          <ChatsCircle size={16} weight="bold" className="text-green-500 md:hidden" />
          <ChatsCircle size={28} weight="bold" className="text-green-500 hidden md:block" />
          <p className="text-[9px] md:text-xs font-medium tracking-widest text-neutral-500 uppercase mt-2 md:mt-4">Posts</p>
          <p className="text-lg md:text-3xl font-medium mt-0.5 text-white">{stats?.post_count ?? 0}</p>
        </Link>

        <Link
          to="/marketplace"
          className="rounded-xl md:rounded-2xl p-3 md:p-6 bg-neutral-900 border border-neutral-800 transition-transform hover:-translate-y-1"
          data-testid="home-marketplace-tile"
        >
          <Storefront size={16} weight="bold" className="text-green-500 md:hidden" />
          <Storefront size={28} weight="bold" className="text-green-500 hidden md:block" />
          <p className="text-[9px] md:text-xs font-medium tracking-widest text-neutral-500 uppercase mt-2 md:mt-4">Market</p>
          <p className="text-sm md:text-2xl font-medium mt-0.5 text-white">{stats?.listing_count ?? 0} listings</p>
        </Link>

        <Link
          to="/events"
          className="rounded-xl md:rounded-2xl p-3 md:p-6 bg-neutral-900 border border-neutral-800 transition-transform hover:-translate-y-1"
          data-testid="home-events-tile"
        >
          <CalendarStar size={16} weight="bold" className="text-green-500 md:hidden" />
          <CalendarStar size={28} weight="bold" className="text-green-500 hidden md:block" />
          <p className="text-[9px] md:text-xs font-medium tracking-widest text-neutral-500 uppercase mt-2 md:mt-4">Events</p>
          <p className="text-sm md:text-2xl font-medium mt-0.5 text-white">View all</p>
        </Link>
      </div>

      {stats?.recent_listing && (
        <p className="text-[11px] md:text-sm text-neutral-500 px-1">Latest listing: {stats.recent_listing.title}</p>
      )}

      {/* Zimbabwe photo band */}
      <div>
        <p className="text-[10px] md:text-xs font-medium tracking-widest text-green-500 uppercase mb-2">Home</p>
        <HomeSlideshow />
      </div>
    </div>
  );
}