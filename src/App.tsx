import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BlackModeProvider, useBlackMode } from './contexts/BlackModeContext';
import { SettingsProvider } from './app/settings';
import AppShell from './app/AppShell';
import Login from './app/pages/Login';
import Settings from './app/pages/Settings';
import Dashboard from './app/pages/Dashboard';
import Parties from './app/pages/Parties';
import Employees from './app/pages/hr/Employees';
import AttendancePage from './app/pages/hr/Attendance';
import Kiosk from './app/pages/hr/Kiosk';
import Leave from './app/pages/hr/Leave';
import Payroll from './app/pages/hr/Payroll';
import './styles/dark-theme.css';
import SubcontractingPage from './pages/SubcontractingPage';
import SubcontractPage from './pages/SubcontractPage';
import CromePage from './pages/CromePage';
import InventoryGroundFloorPage from './pages/InventoryGroundFloorPage';
import InventoryFirstFloorPage from './pages/InventoryFirstFloorPage';
import RawInventoryPage from './pages/RawInventoryPage';
import InventoryProductsPage from './pages/InventoryProductsPage';
import CategoryPage from './pages/CategoryPage';
import OrderGroundFloorPage from './pages/OrderGroundFloorPage';
import OrderFirstFloorPage from './pages/OrderFirstFloorPage';
import ProductCatalogPage from './pages/ProductCatalogPage';
import InvoiceGroundFloorPage from './pages/InvoiceGroundFloorPage';
import InvoiceFirstFloorPage from './pages/InvoiceFirstFloorPage';
import PaymentReminderGroundFloorPage from './pages/PaymentReminderGroundFloorPage';
import PaymentReminderFirstFloorPage from './pages/PaymentReminderFirstFloorPage';
import KevinScrapPage from './pages/KevinScrapPage';
import JayeshScrapPage from './pages/JayeshScrapPage';
import ElectricPage from './pages/ElectricPage';
import CastingPage from './pages/CastingPage';
import ForgingPage from './pages/ForgingPage';
import PurchasePage from './pages/PurchasePage';
import CashflowPage from './pages/CashflowPage';
import RejectionPage from './pages/RejectionPage';
import CRMPage from './pages/CRMPage';
import './App.css';

const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { isBlackMode } = useBlackMode();

  if (isLoading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return isAuthenticated || isBlackMode ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <SettingsProvider>
    <BlackModeProvider>
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/catalog" element={<ProductCatalogPage />} />

          <Route
            path="/"
            element={
              <PrivateRoute>
                <AppShell />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="parties" element={<Parties />} />
            <Route path="hr/employees" element={<Employees />} />
            <Route path="hr/attendance" element={<AttendancePage />} />
            <Route path="hr/kiosk" element={<Kiosk />} />
            <Route path="hr/leave" element={<Leave />} />
            <Route path="hr/payroll" element={<Payroll />} />
            <Route path="crm" element={<CRMPage />} />
            <Route path="inventory/ground-floor" element={<InventoryGroundFloorPage />} />
            <Route path="inventory/first-floor" element={<InventoryFirstFloorPage />} />
            <Route path="inventory/raw-materials" element={<RawInventoryPage />} />
            <Route path="item-master/products" element={<InventoryProductsPage />} />
            <Route path="item-master/categories" element={<CategoryPage />} />
            <Route path="orders/ground-floor" element={<OrderGroundFloorPage />} />
            <Route path="orders/first-floor" element={<OrderFirstFloorPage />} />
            <Route path="subcontracting" element={<SubcontractingPage />} />
            <Route path="subcontractor" element={<SubcontractPage />} />
            <Route path="crome" element={<CromePage />} />
            <Route path="invoices/ground-floor" element={<InvoiceGroundFloorPage />} />
            <Route path="invoices/first-floor" element={<InvoiceFirstFloorPage />} />
            <Route path="payment-reminder/ground-floor" element={<PaymentReminderGroundFloorPage />} />
            <Route path="payment-reminder/first-floor" element={<PaymentReminderFirstFloorPage />} />
            <Route path="scrap/kevin" element={<KevinScrapPage />} />
            <Route path="scrap/jayesh" element={<JayeshScrapPage />} />
            <Route path="party-master" element={<Navigate to="/parties" replace />} />
            <Route path="electric" element={<ElectricPage />} />
            <Route path="casting" element={<CastingPage />} />
            <Route path="forging" element={<ForgingPage />} />
            <Route path="purchase" element={<PurchasePage />} />
            <Route path="rejection" element={<RejectionPage />} />
            <Route path="cashflow" element={<CashflowPage />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
    </BlackModeProvider>
    </SettingsProvider>
  );
}

export default App;
