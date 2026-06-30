import { useState } from "react";
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
  List,
  X,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { to: "/home", label: "Home", icon: House, testid: "nav-home" },
  { to: "/calls", label: "Calls", icon: Phone, testid: "nav-calls" },
  { to: "/wallet", label: "Wallet", icon: Wallet, testid: "nav-wallet" },
  { to: "/marketplace", label: "Market", icon: Storefront, testid: "nav-marketplace" },
  { to: "/events", label: "Events", icon: CalendarStar, testid: "nav-events" },
  { to: "/community", label: "Community", icon: ChatsCircle, testid: "nav-community" },
];

const ADMIN_NAV = [
  { to: "/admin", label: "Admin", icon: ShieldStar, testid: "nav-admin" },
  { to: "/admin/users", label: "Users", icon: Users, testid: "nav-admin-users" },
  { to: "/admin/rates", label: "Rates", icon: CurrencyDollar, testid: "nav-admin-rates" },
  { to: "/admin/settings", label: "Settings", icon: Gear, testid: "nav-admin-settings" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = user?.is_admin ? [...NAV, ...ADMIN_NAV] : NAV;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-black border-b border-neutral-800 px-5 py-3 flex justify-between items-center">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-white p-2 -ml-2"
          aria-label="Open menu"
        >
          <List size={26} weight="bold" />
        </button>

        <img src={logo} alt="ZimLink" className="h-10 max-w-[150px] object-contain" />

        <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-black font-medium text-sm">
          {user?.name?.[0]?.toUpperCase() || "U"}
        </div>
      </header>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Slide-out sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-72 bg-neutral-950 border-r border-neutral-800 z-50 transform transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } flex flex-col p-5`}
      >
        <div className="flex justify-between items-center mb-6">
          <img src={logo} alt="ZimLink" className="h-12 max-w-[160px] object-contain" />
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-neutral-400 p-1"
            aria-label="Close menu"
          >
            <X size={22} weight="bold" />
          </button>
        </div>

        <nav className="flex flex-col gap-2 flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/home"}
              data-testid={item.testid}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-green-600 text-black"
                    : "text-neutral-300 hover:bg-neutral-900"
                }`
              }
            >
              <item.icon size={20} weight="bold" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-neutral-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-black font-medium">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate text-white" data-testid="sidebar-user-name">
                {user?.name}
              </p>
              <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-700 text-neutral-300 text-sm font-medium py-2.5 hover:bg-neutral-900 transition-colors"
          >
            <SignOut size={16} weight="bold" /> Log out
          </button>
        </div>
      </aside>

      <main className="pb-8 min-h-screen">
        <div className="p-5 md:p-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}