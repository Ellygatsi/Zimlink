import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { ACCENTS } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, Phone, Wallet, Storefront, ChatsCircle } from "@phosphor-icons/react";

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/stats/home").then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6" data-testid="home-page">
      <div>
        <p className="overline text-neutral-500">SUPER HUB</p>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mt-2">
          Hey, {user?.name?.split(" ")[0] || "friend"}.
        </h1>
        <p className="text-base md:text-lg text-neutral-700 mt-3 max-w-xl">
          Stay connected to Zimbabwe — calls, money, marketplace, and community in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Wallet — big tile */}
        <Link
          to="/wallet"
          className="nb-card p-6 md:col-span-2 md:row-span-2 transition-all duration-150 hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)]"
          style={{ backgroundColor: ACCENTS.wallet }}
          data-testid="home-wallet-tile"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="overline">WALLET BALANCE</p>
              <p className="text-5xl md:text-7xl font-black tracking-tighter mt-3 mono">
                ${(stats?.balance ?? 0).toFixed(2)}
              </p>
              <p className="text-sm mt-3 font-medium">{stats?.tx_count ?? 0} transactions</p>
            </div>
            <Wallet size={40} weight="bold" />
          </div>
          <div className="mt-8 flex items-center gap-2 font-bold">
            Send & Receive <ArrowRight size={18} weight="bold" />
          </div>
        </Link>

        {/* Calls */}
        <Link
          to="/calls"
          className="nb-card p-6 transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] text-white"
          style={{ backgroundColor: ACCENTS.calling }}
          data-testid="home-calls-tile"
        >
          <Phone size={32} weight="bold" />
          <p className="overline mt-4">CALLS</p>
          <p className="text-3xl font-black mt-1">{stats?.call_count ?? 0}</p>
          <p className="text-xs mt-1 opacity-80">Dial anyone, anywhere</p>
        </Link>

        {/* Community */}
        <Link
          to="/community"
          className="nb-card p-6 transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)]"
          style={{ backgroundColor: ACCENTS.community }}
          data-testid="home-community-tile"
        >
          <ChatsCircle size={32} weight="bold" />
          <p className="overline mt-4">POSTS</p>
          <p className="text-3xl font-black mt-1">{stats?.post_count ?? 0}</p>
          <p className="text-xs mt-1">Join the chatter</p>
        </Link>

        {/* Marketplace */}
        <Link
          to="/marketplace"
          className="nb-card p-6 md:col-span-3 transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)]"
          style={{ backgroundColor: ACCENTS.marketplace }}
          data-testid="home-marketplace-tile"
        >
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <Storefront size={32} weight="bold" />
              <p className="overline mt-4">MARKETPLACE</p>
              <p className="text-3xl font-black mt-1">{stats?.listing_count ?? 0} listings live</p>
              {stats?.recent_listing && (
                <p className="text-sm mt-2 font-medium">Latest: {stats.recent_listing.title}</p>
              )}
            </div>
            <div className="nb-btn bg-white text-black">Browse <ArrowRight size={16} weight="bold" /></div>
          </div>
        </Link>
      </div>
    </div>
  );
}
