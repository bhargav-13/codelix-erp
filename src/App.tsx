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
import Orders from './app/pages/sales/Orders';
import Invoices from './app/pages/sales/Invoices';
import Payments from './app/pages/sales/Payments';
import Stock from './app/pages/inventory/Stock';
import RawMaterials from './app/pages/inventory/RawMaterials';
import { Categories, Products } from './app/pages/inventory/NameList';
import Purchase from './app/pages/inventory/Purchase';
import Rejection from './app/pages/inventory/Rejection';
import Employees from './app/pages/hr/Employees';
import AttendancePage from './app/pages/hr/Attendance';
import Kiosk from './app/pages/hr/Kiosk';
import Leave from './app/pages/hr/Leave';
import Payroll from './app/pages/hr/Payroll';
import './styles/dark-theme.css';
import SubcontractingPage from './pages/SubcontractingPage';
import SubcontractPage from './pages/SubcontractPage';
import CromePage from './pages/CromePage';
import ProductCatalogPage from './pages/ProductCatalogPage';
import KevinScrapPage from './pages/KevinScrapPage';
import JayeshScrapPage from './pages/JayeshScrapPage';
import ElectricPage from './pages/ElectricPage';
import CastingPage from './pages/CastingPage';
import ForgingPage from './pages/ForgingPage';
import CashflowPage from './pages/CashflowPage';
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
            <Route path="stock" element={<Stock />} />
            <Route path="inventory/ground-floor" element={<Navigate to="/stock?unit=1" replace />} />
            <Route path="inventory/first-floor" element={<Navigate to="/stock?unit=2" replace />} />
            <Route path="raw-materials" element={<RawMaterials />} />
            <Route path="inventory/raw-materials" element={<Navigate to="/raw-materials" replace />} />
            <Route path="products" element={<Products />} />
            <Route path="item-master/products" element={<Navigate to="/products" replace />} />
            <Route path="categories" element={<Categories />} />
            <Route path="item-master/categories" element={<Navigate to="/categories" replace />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/ground-floor" element={<Navigate to="/orders?unit=1" replace />} />
            <Route path="orders/first-floor" element={<Navigate to="/orders?unit=2" replace />} />
            <Route path="subcontracting" element={<SubcontractingPage />} />
            <Route path="subcontractor" element={<SubcontractPage />} />
            <Route path="crome" element={<CromePage />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/ground-floor" element={<Navigate to="/invoices?unit=1" replace />} />
            <Route path="invoices/first-floor" element={<Navigate to="/invoices?unit=2" replace />} />
            <Route path="payments" element={<Payments />} />
            <Route path="payment-reminder/ground-floor" element={<Navigate to="/payments?unit=1" replace />} />
            <Route path="payment-reminder/first-floor" element={<Navigate to="/payments?unit=2" replace />} />
            <Route path="scrap/kevin" element={<KevinScrapPage />} />
            <Route path="scrap/jayesh" element={<JayeshScrapPage />} />
            <Route path="party-master" element={<Navigate to="/parties" replace />} />
            <Route path="electric" element={<ElectricPage />} />
            <Route path="casting" element={<CastingPage />} />
            <Route path="forging" element={<ForgingPage />} />
            <Route path="purchase" element={<Purchase />} />
            <Route path="rejection" element={<Rejection />} />
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
