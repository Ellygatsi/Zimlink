import { useState } from "react";
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

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-800 px-3 py-2 md:px-5 md:py-3 flex items-center justify-between">

        <button
          onClick={() => setSidebarOpen(true)}
          className="text-black dark:text-white"
        >
          <List size={22} weight="bold" />
        </button>

        <img
          src={logo}
          alt="ZimLink"
          className="h-8 md:h-10 object-contain"
        />

        <button
          onClick={() => navigate("/profile")}
          className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-600 flex items-center justify-center text-black font-bold"
        >
          {user?.name?.[0]?.toUpperCase() || "U"}
        </button>

      </header>

      {/* OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-72 bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } flex flex-col`}
      >

        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800">

          <img
            src={logo}
            alt="ZimLink"
            className="h-10 object-contain"
          />

          <button
            onClick={() => setSidebarOpen(false)}
            className="text-neutral-500"
          >
            <X size={22} weight="bold" />
          </button>

        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">

          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/home"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                  isActive
                    ? "bg-green-600 text-black font-semibold"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-900"
                }`
              }
            >
              <item.icon size={20} weight="bold" />
              {item.label}
            </NavLink>
          ))}

        </nav>

        <div className="border-t border-neutral-200 dark:border-neutral-800 p-4 space-y-4">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-2">
              {isDark ? (
                <Moon size={18} weight="bold" />
              ) : (
                <Sun size={18} weight="bold" />
              )}

              <span className="text-sm">
                {isDark ? "Dark Mode" : "Light Mode"}
              </span>
            </div>

            <button
              onClick={toggleTheme}
              className={`w-11 h-6 rounded-full flex items-center px-1 ${
                isDark
                  ? "justify-end bg-green-600"
                  : "justify-start bg-neutral-300"
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white" />
            </button>

          </div>

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center font-bold text-black">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>

            <div className="flex-1 overflow-hidden">
              <p className="font-semibold truncate">
                {user?.name}
              </p>
              <p className="text-xs text-neutral-500 truncate">
                {user?.email}
              </p>
            </div>

          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            <SignOut size={18} weight="bold" />
            Log out
          </button>

        </div>

      </aside>

      {/* PAGE CONTENT */}
      <main className="min-h-screen">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

    </div>
  );
}