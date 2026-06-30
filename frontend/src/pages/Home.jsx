import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, Phone, Wallet, Storefront, ChatsCircle } from "@phosphor-icons/react";

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/stats/home").then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-5 md:space-y-6 bg-black min-h-screen" data-testid="home-page">
      <div>
        <p className="text-[11px] md:text-xs font-medium tracking-widest text-green-500 uppercase">Super hub</p>
        <h1 className="text-3xl md:text-6xl font-medium tracking-tight mt-1.5 md:mt-2 text-white">
          Hey, {user?.name?.split(" ")[0] || "friend"}.
        </h1>
        <p className="text-xs md:text-base text-neutral-400 mt-2 md:mt-3 max-w-xl">
          Stay connected to Zimbabwe — calls, money, marketplace, and community in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {/* Wallet — big hero tile */}
        <Link
          to="/wallet"
          className="rounded-xl md:rounded-2xl p-4 md:p-6 md:col-span-2 md:row-span-2 bg-green-600 transition-transform hover:-translate-y-1"
          data-testid="home-wallet-tile"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium tracking-widest text-black/70 uppercase">Wallet balance</p>
              <p className="text-3xl md:text-7xl font-medium tracking-tight mt-2 md:mt-3 text-black">
                ${(stats?.balance ?? 0).toFixed(2)}
              </p>
              <p className="text-xs md:text-sm mt-2 md:mt-3 font-medium text-black/70">{stats?.tx_count ?? 0} transactions</p>
            </div>
            <Wallet size={22} weight="bold" className="text-black md:hidden" />
            <Wallet size={36} weight="bold" className="text-black hidden md:block" />
          </div>
          <div className="mt-4 md:mt-8 inline-flex items-center gap-2 font-medium text-black bg-black/10 rounded-full px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm">
            Send & receive <ArrowRight size={14} weight="bold" />
          </div>
        </Link>

        {/* Calls */}
        <Link
          to="/calls"
          className="rounded-xl md:rounded-2xl p-4 md:p-6 bg-neutral-900 border border-neutral-800 transition-transform hover:-translate-y-1"
          data-testid="home-calls-tile"
        >
          <Phone size={20} weight="bold" className="text-green-500 md:hidden" />
          <Phone size={28} weight="bold" className="text-green-500 hidden md:block" />
          <p className="text-[10px] md:text-xs font-medium tracking-widest text-neutral-500 uppercase mt-3 md:mt-4">Calls</p>
          <p className="text-2xl md:text-3xl font-medium mt-1 text-white">{stats?.call_count ?? 0}</p>
          <p className="text-[11px] md:text-xs mt-1 text-neutral-500">Dial anyone, anywhere</p>
        </Link>

        {/* Community */}
        <Link
          to="/community"
          className="rounded-xl md:rounded-2xl p-4 md:p-6 bg-neutral-900 border border-neutral-800 transition-transform hover:-translate-y-1"
          data-testid="home-community-tile"
        >
          <ChatsCircle size={20} weight="bold" className="text-green-500 md:hidden" />
          <ChatsCircle size={28} weight="bold" className="text-green-500 hidden md:block" />
          <p className="text-[10px] md:text-xs font-medium tracking-widest text-neutral-500 uppercase mt-3 md:mt-4">Posts</p>
          <p className="text-2xl md:text-3xl font-medium mt-1 text-white">{stats?.post_count ?? 0}</p>
          <p className="text-[11px] md:text-xs mt-1 text-neutral-500">Join the chatter</p>
        </Link>

        {/* Marketplace */}
        <Link
          to="/marketplace"
          className="rounded-xl md:rounded-2xl p-4 md:p-6 md:col-span-3 bg-neutral-900 border border-neutral-800 transition-transform hover:-translate-y-1"
          data-testid="home-marketplace-tile"
        >
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-center justify-between">
            <div>
              <Storefront size={20} weight="bold" className="text-green-500 md:hidden" />
              <Storefront size={28} weight="bold" className="text-green-500 hidden md:block" />
              <p className="text-[10px] md:text-xs font-medium tracking-widest text-neutral-500 uppercase mt-3 md:mt-4">Marketplace</p>
              <p className="text-xl md:text-2xl font-medium mt-1 text-white">{stats?.listing_count ?? 0} listings live</p>
              {stats?.recent_listing && (
                <p className="text-xs md:text-sm mt-1.5 md:mt-2 text-neutral-400">Latest: {stats.recent_listing.title}</p>
              )}
            </div>
            <div className="inline-flex items-center gap-2 bg-green-600 text-black rounded-full px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium">
              Browse <ArrowRight size={14} weight="bold" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}