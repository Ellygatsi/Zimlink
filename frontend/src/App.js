import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Home from "@/pages/Home";
import Calls from "@/pages/Calls";
import WalletPage from "@/pages/Wallet";
import Marketplace from "@/pages/Marketplace";
import MarketplaceDetail from "@/pages/MarketplaceDetail";
import Community from "@/pages/Community";
import "@/App.css";

function Protected({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

function App() {
  return (
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
          <Route path="/" element={<Protected><Home /></Protected>} />
          <Route path="/calls" element={<Protected><Calls /></Protected>} />
          <Route path="/wallet" element={<Protected><WalletPage /></Protected>} />
          <Route path="/marketplace" element={<Protected><Marketplace /></Protected>} />
          <Route path="/marketplace/:id" element={<Protected><MarketplaceDetail /></Protected>} />
          <Route path="/community" element={<Protected><Community /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
