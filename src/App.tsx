import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import DashboardOverview from "./pages/dashboard/Overview";
import PaymentCodes from "./pages/dashboard/PaymentCodes";
import Invoices from "./pages/dashboard/Invoices";
import InvoiceEditor from "./pages/dashboard/InvoiceEditor";
import Staking from "./pages/dashboard/Staking";
import Settings from "./pages/dashboard/Settings";
import ShopPage from "./pages/shop/ShopPage";
import PayPage from "./pages/pay/PayPage";
import InvoicePage from "./pages/invoice/InvoicePage";
import Wallet from "./pages/wallet/Wallet";
import Explore from "./pages/wallet/Explore";
import Scan from "./pages/wallet/Scan";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      {/* Merchant Dashboard */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<DashboardOverview />} />
        <Route path="payment-codes" element={<PaymentCodes />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/new" element={<InvoiceEditor />} />
        <Route path="staking" element={<Staking />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Public payment pages */}
      <Route path="/shop/:slug" element={<ShopPage />} />
      <Route path="/pay/:id" element={<PayPage />} />
      <Route path="/invoice/:id" element={<InvoicePage />} />

      {/* User wallet */}
      <Route path="/wallet" element={<Wallet />} />
      <Route path="/explore" element={<Explore />} />
      <Route path="/scan" element={<Scan />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
