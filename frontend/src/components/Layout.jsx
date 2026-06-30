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
  Sun,
  Moon,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

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
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = user?.is_admin ? [...NAV, ...ADMIN_NAV] : NAV;

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-800 px-3 py-2 md:px-5 md:py-3 flex justify-between items-center transition-colors">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-black dark:text-white p-1.5 -ml-1"
          aria-label="Open menu"
        >
          <List size={22} weight="bold" />
        </button>

        <img src={logo} alt="ZimLink" className="h-7 md:h-10 max-w-[110px] md:max-w-[150px] object-contain" />

        <div className="w-7 h-7 md:w-10 md:h-10 rounded-full bg-green-600 flex items-center justify-center text-black font-medium text-xs md:text-sm">
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
        className={`fixed top-0 left-0 h-screen w-64 md:w-72 bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 z-50 transform transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } flex flex-col p-4 md:p-5`}
      >
        <div className="flex justify-between items-center mb-5">
          <img src={logo} alt="ZimLink" className="h-9 md:h-12 max-w-[130px] md:max-w-[160px] object-contain" />
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-neutral-500 dark:text-neutral-400 p-1"
            aria-label="Close menu"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/home"}
              data-testid={item.testid}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-green-600 text-black"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                }`
              }
            >
              <item.icon size={18} weight="bold" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Theme toggle */}
        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between px-1 py-2">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {isDark ? <Moon size={18} weight="bold" /> : <Sun size={18} weight="bold" />}
              <span>{isDark ? "Dark mode" : "Light mode"}</span>
            </div>
            <button
              onClick={toggleTheme}
              role="switch"
              aria-checked={isDark}
              aria-label="Toggle dark mode"
              className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${
                isDark ? "bg-green-600 justify-end" : "bg-neutral-300 justify-start"
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow" />
            </button>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-black font-medium text-sm">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate text-black dark:text-white" data-testid="sidebar-user-name">
                {user?.name}
              </p>
              <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-sm font-medium py-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
          >
            <SignOut size={16} weight="bold" /> Log out
          </button>
        </div>
      </aside>

      <main className="pb-8 min-h-screen">
        <div className="p-4 md:p-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}