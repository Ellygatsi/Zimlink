import { NavLink, useNavigate } from "react-router-dom";
import { House, Phone, Wallet, Storefront, ChatsCircle, SignOut, ShieldStar } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { ACCENTS } from "@/lib/api";

const NAV = [
  { to: "/", label: "Home", icon: House, color: "#0A0A0A", testid: "nav-home" },
  { to: "/calls", label: "Calls", icon: Phone, color: ACCENTS.calling, testid: "nav-calls" },
  { to: "/wallet", label: "Wallet", icon: Wallet, color: ACCENTS.wallet, testid: "nav-wallet" },
  { to: "/marketplace", label: "Market", icon: Storefront, color: ACCENTS.marketplace, testid: "nav-marketplace" },
  { to: "/community", label: "Community", icon: ChatsCircle, color: ACCENTS.community, testid: "nav-community" },
];

const ADMIN_NAV = { to: "/admin", label: "Admin", icon: ShieldStar, color: "#0A0A0A", testid: "nav-admin" };

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = user?.is_admin ? [...NAV, ADMIN_NAV] : NAV;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-black">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 border-r-2 border-black bg-white p-6 z-40">
        <div className="mb-10">
          <h1 className="text-3xl font-black tracking-tighter">ZIM<span className="text-[#FFC900]">·</span>LINK</h1>
          <p className="overline text-neutral-500 mt-1">CALL ZIMBABWE</p>
        </div>
        <nav className="flex flex-col gap-2 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              data-testid={item.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 border-2 border-black rounded-xl font-bold text-sm transition-all duration-150 ${
                  isActive
                    ? "shadow-[4px_4px_0px_rgba(0,0,0,1)] -translate-y-0.5"
                    : "shadow-none bg-white hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_rgba(0,0,0,1)]"
                }`
              }
              style={({ isActive }) => isActive ? { backgroundColor: item.color, color: item.color === "#FFC900" || item.color === "#00E59B" ? "#0A0A0A" : "#FFFFFF" } : {}}
            >
              <item.icon size={20} weight="bold" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t-2 border-black">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full border-2 border-black bg-[#FFC900] flex items-center justify-center font-black">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate" data-testid="sidebar-user-name">{user?.name}</p>
              <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="nb-btn w-full bg-white text-sm"
          >
            <SignOut size={16} weight="bold" /> Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 bg-white border-b-2 border-black px-5 py-4 flex justify-between items-center">
        <h1 className="text-xl font-black tracking-tighter">ZIM<span className="text-[#FFC900]">·</span>LINK</h1>
        <button onClick={handleLogout} className="text-xs font-bold uppercase tracking-wider" data-testid="logout-button-mobile">
          Exit
        </button>
      </header>

      {/* Main content */}
      <main className="md:ml-64 pb-24 md:pb-8 min-h-screen">
        <div className="p-5 md:p-8 max-w-6xl">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-black flex justify-around py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            data-testid={`${item.testid}-mobile`}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all ${
                isActive ? "font-black" : "font-medium text-neutral-500"
              }`
            }
            style={({ isActive }) => isActive ? { color: item.color === "#0A0A0A" ? "#0A0A0A" : item.color } : {}}
          >
            <item.icon size={22} weight="bold" />
            <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
