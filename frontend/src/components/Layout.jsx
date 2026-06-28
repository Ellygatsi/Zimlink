import logo from "@/Assets/logo.png";
import { NavLink, useNavigate } from "react-router-dom";
import {
  House,
  Phone,
  Wallet,
  Storefront,
  ChatsCircle,
  SignOut,
  ShieldStar,
  Users,
  Gear,
  CurrencyDollar,
  CalendarStar,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { ACCENTS } from "@/lib/api";

const NAV = [
  { to: "/home", label: "Home", icon: House, color: "#0A0A0A", testid: "nav-home" },
  { to: "/calls", label: "Calls", icon: Phone, color: ACCENTS.calling, testid: "nav-calls" },
  { to: "/wallet", label: "Wallet", icon: Wallet, color: ACCENTS.wallet, testid: "nav-wallet" },
  { to: "/marketplace", label: "Market", icon: Storefront, color: ACCENTS.marketplace, testid: "nav-marketplace" },
  { to: "/events", label: "Events", icon: CalendarStar, color: ACCENTS.calling, testid: "nav-events" },
  { to: "/community", label: "Community", icon: ChatsCircle, color: ACCENTS.community, testid: "nav-community" },
];

const ADMIN_NAV = [
  { to: "/admin", label: "Admin", icon: ShieldStar, color: "#0A0A0A", testid: "nav-admin" },
  { to: "/admin/users", label: "Users", icon: Users, color: ACCENTS.calling, testid: "nav-admin-users" },
  { to: "/admin/rates", label: "Rates", icon: CurrencyDollar, color: ACCENTS.wallet, testid: "nav-admin-rates" },
  { to: "/admin/settings", label: "Settings", icon: Gear, color: ACCENTS.alert, testid: "nav-admin-settings" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = user?.is_admin ? [...NAV, ...ADMIN_NAV] : NAV;

  return (
    <div className="min-h-screen text-black">
      <div className="fixed top-0 left-0 right-0 z-[60] flex h-[4px]">
        <div className="flex-1" style={{ background: "#009639" }} />
        <div className="flex-1" style={{ background: "#FFCD00" }} />
        <div className="flex-1" style={{ background: "#DE2010" }} />
        <div className="flex-1" style={{ background: "#0A0A0A" }} />
      </div>

      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 border-r-2 border-black bg-white/95 backdrop-blur-sm p-5 pt-7 z-40">
        <div className="mb-6">
          <div className="flex flex-col items-center">
            <img
              src={logo}
              alt="ZimLink"
              className="w-48 max-h-28 object-contain"
            />
          </div>

          <p className="overline text-center text-neutral-500 mt-2">
            CONNECTING ZIMBABWE
          </p>
        </div>

        <nav className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/home"}
              data-testid={item.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 border-2 border-black rounded-xl font-bold text-sm transition-all duration-150 ${
                  isActive
                    ? "shadow-[4px_4px_0px_rgba(0,0,0,1)] -translate-y-0.5"
                    : "shadow-none bg-white hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_rgba(0,0,0,1)]"
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      backgroundColor: item.color,
                      color:
                        item.color === "#FFCD00" || item.color === "#4ADE80"
                          ? "#0A0A0A"
                          : "#FFFFFF",
                    }
                  : {}
              }
            >
              <item.icon size={20} weight="bold" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t-2 border-black">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full border-2 border-black bg-[#FFCD00] flex items-center justify-center font-black">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>

            <div className="flex-1 min-w-0">
              <p
                className="font-bold text-sm truncate"
                data-testid="sidebar-user-name"
              >
                {user?.name}
              </p>
              <p className="text-xs text-neutral-500 truncate">
                {user?.email}
              </p>
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

      <header className="md:hidden sticky top-[4px] z-40 bg-white/95 backdrop-blur-sm border-b-2 border-black px-5 py-3 flex justify-between items-center">
        <img
          src={logo}
          alt="ZimLink"
          className="h-12 max-w-[170px] object-contain"
        />

        <button
          onClick={handleLogout}
          className="text-xs font-bold uppercase tracking-wider"
          data-testid="logout-button-mobile"
        >
          Exit
        </button>
      </header>

      <main className="md:ml-64 pb-24 md:pb-8 min-h-screen">
        <div className="p-5 md:p-8 max-w-6xl">{children}</div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-black flex justify-around py-2 overflow-x-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/home"}
            data-testid={`${item.testid}-mobile`}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all min-w-[64px] ${
                isActive ? "font-black" : "font-medium text-neutral-500"
              }`
            }
            style={({ isActive }) =>
              isActive
                ? { color: item.color === "#0A0A0A" ? "#0A0A0A" : item.color }
                : {}
            }
          >
            <item.icon size={22} weight="bold" />
            <span className="text-[10px] uppercase tracking-wider">
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}