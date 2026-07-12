import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Home from "@/pages/Home";
import Calls from "@/pages/Calls";
import WalletPage from "@/pages/Wallet";
import Marketplace from "@/pages/Marketplace";
import MarketplaceDetail from "@/pages/MarketplaceDetail";
import Events from "@/pages/Events";
import EventDetail from "@/pages/EventDetail";
import Community from "@/pages/Community";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminRates from "@/pages/AdminRates";
import AdminSettings from "@/pages/AdminSettings";
import AdminUsers from "@/pages/AdminUsers";
import AdminGuard from "@/components/AdminGuard";
import TicketSuccess from "@/pages/TicketSuccess";
import Profile from "@/pages/Profile";
import "@/App.css";

function Protected({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

function AdminProtected({ children }) {
  return (
    <Protected>
      <AdminGuard>{children}</AdminGuard>
    </Protected>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                border: "2px solid black",
                borderRadius: "12px",
                boxShadow: "4px 4px 0px rgba(0,0,0,1)",
                fontFamily: "Satoshi, sans-serif",
                fontWeight: 700,
              },
            }}
          />

          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/" element={<Navigate to="/home" replace />} />

            <Route
              path="/home"
              element={
                <Protected>
                  <Home />
                </Protected>
              }
            />

            <Route
              path="/calls"
              element={
                <Protected>
                  <Calls />
                </Protected>
              }
            />

            <Route
              path="/wallet"
              element={
                <Protected>
                  <WalletPage />
                </Protected>
              }
            />

            <Route
              path="/marketplace"
              element={
                <Protected>
                  <Marketplace />
                </Protected>
              }
            />

            <Route
              path="/marketplace/:id"
              element={
                <Protected>
                  <MarketplaceDetail />
                </Protected>
              }
            />

            <Route
              path="/events"
              element={
                <Protected>
                  <Events />
                </Protected>
              }
            />

            <Route
              path="/events/:id"
              element={
                <Protected>
                  <EventDetail />
                </Protected>
              }
            />

            <Route
              path="/community"
              element={
                <Protected>
                  <Community />
                </Protected>
              }
            />

            <Route
              path="/tickets/success"
              element={
                <Protected>
                  <TicketSuccess />
                </Protected>
              }
            />

            <Route
              path="/profile"
              element={
                <Protected>
                  <Profile />
                </Protected>
              }
            />

            <Route
              path="/admin"
              element={
                <AdminProtected>
                  <AdminDashboard />
                </AdminProtected>
              }
            />

            <Route
              path="/admin/users"
              element={
                <AdminProtected>
                  <AdminUsers />
                </AdminProtected>
              }
            />

            <Route
              path="/admin/rates"
              element={
                <AdminProtected>
                  <AdminRates />
                </AdminProtected>
              }
            />

            <Route
              path="/admin/settings"
              element={
                <AdminProtected>
                  <AdminSettings />
                </AdminProtected>
              }
            />

            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
