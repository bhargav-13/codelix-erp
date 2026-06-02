import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';
import DashboardSVG from '../assets/icon/dashboard.svg'
import CRMSSVG from '../assets/icon/crm.svg'
import InventorySVG from '../assets/icon/inventory.svg'
import InvoiceIcon from '../assets/icon/invoice.svg'
import OrderIcon from '../assets/icon/order.svg'
import ReminderIcon from '../assets/icon/reminder.svg'
import SettingIcon from '../assets/icon/settings.svg'
import SubcontractIcon from '../assets/icon/subcontract.svg'
import ProfileSVG from '../assets/icon/profile.svg'

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const [inventoryExpanded, setInventoryExpanded] = useState(
    location.pathname.startsWith('/inventory')
  );
  const [itemMasterExpanded, setItemMasterExpanded] = useState(
    location.pathname.startsWith('/item-master')
  );
  const [ordersExpanded, setOrdersExpanded] = useState(
    location.pathname.startsWith('/orders')
  );
  const [subcontractingExpanded, setSubcontractingExpanded] = useState(
    location.pathname.startsWith('/subcontracting') || location.pathname.startsWith('/subcontractor') || location.pathname.startsWith('/crome')
  );
  const [invoicesExpanded, setInvoicesExpanded] = useState(
    location.pathname.startsWith('/invoices')
  );
  const [paymentReminderExpanded, setPaymentReminderExpanded] = useState(
    location.pathname.startsWith('/payment-reminder')
  );
  const [scrapExpanded, setScrapExpanded] = useState(
    location.pathname.startsWith('/scrap')
  );

  const isInventoryActive = location.pathname.startsWith('/inventory');
  const isItemMasterActive = location.pathname.startsWith('/item-master');
  const isOrdersActive = location.pathname.startsWith('/orders');
  const isSubcontractingActive = location.pathname.startsWith('/subcontracting') || location.pathname.startsWith('/subcontractor') || location.pathname.startsWith('/crome');
  const isInvoicesActive = location.pathname.startsWith('/invoices');
  const isPaymentReminderActive = location.pathname.startsWith('/payment-reminder');
  const isScrapActive = location.pathname.startsWith('/scrap');

  const menuItems = [
    { path: '/dashboard', icon: <img src={DashboardSVG} alt='dashboard' />, label: 'Dashboard' },
        { path: '/cashflow', icon: <img src={InvoiceIcon} alt='Cashflow' />, label: 'Cashflow' },
    { path: '/crm', icon: <img src={CRMSSVG} alt='CRM' />, label: 'CRM & Sales' },
    { path: '/party-master', icon: <img src={ProfileSVG} alt='Party Master' />, label: 'Party Master' },
    { path: '/electric', icon: <img src={SettingIcon} alt='Electric' />, label: 'Electric' },
    { path: '/casting', icon: <img src={SubcontractIcon} alt='Casting' />, label: 'Casting' },
    { path: '/forging', icon: <img src={SettingIcon} alt='Forging' />, label: 'Forging' },
    { path: '/purchase', icon: <img src={OrderIcon} alt='Purchase' />, label: 'Purchase' },
    { path: '/rejection', icon: <img src={SettingIcon} alt='Rejection' />, label: 'Rejection' },
  ];

  const inventorySubItems = [
    { path: '/inventory/ground-floor', label: 'Ground Floor' },
    { path: '/inventory/first-floor', label: 'First Floor' },
    { path: '/inventory/raw-materials', label: 'Raw Materials' },
  ];

  const itemMasterSubItems = [
    { path: '/item-master/products', label: 'Inventory Products' },
    { path: '/item-master/categories', label: 'Category' },
  ];

  const ordersSubItems = [
    { path: '/orders/ground-floor', label: 'Ground Floor' },
    { path: '/orders/first-floor', label: 'First Floor' },
  ];

  const invoicesSubItems = [
    { path: '/invoices/ground-floor', label: 'Ground Floor' },
    { path: '/invoices/first-floor', label: 'First Floor' },
  ];

  const paymentReminderSubItems = [
    { path: '/payment-reminder/ground-floor', label: 'Ground Floor' },
    { path: '/payment-reminder/first-floor', label: 'First Floor' },
  ];

  const scrapSubItems = [
    { path: '/scrap/jayesh', label: 'Jayesh' },
    { path: '/scrap/kevin', label: 'Kevin' },
  ];

  const subcontractingSubItems = [
    { path: '/subcontracting', label: 'Subcontracting' },
    { path: '/subcontractor', label: 'Subcontractor' },
    { path: '/crome', label: 'Crome' },
  ];

  return (
    <div className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <img src="/logo.svg" alt="4bitx ERP" className="logo-img" />
          <span className="brand-label">ERP</span>
        </div>
        <button
          type="button"
          className="mobile-close-btn"
          onClick={onClose}
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      <div className="sidebar-divider"></div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
            onClick={onClose}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </Link>
        ))}

        {/* Inventory Section */}
        <div className="sidebar-section">
          <div
            className={`sidebar-item ${isInventoryActive ? 'active' : ''}`}
            onClick={() => setInventoryExpanded(!inventoryExpanded)}
          >
            <span className="sidebar-icon"><img src={InventorySVG} alt='Inventory' /></span>
            <span className="sidebar-label">Inventory</span>
            <span className={`expand-icon ${inventoryExpanded ? 'expanded' : ''}`}>▼</span>
          </div>
          <div className={`sidebar-subsection ${inventoryExpanded ? 'expanded' : ''}`}>
            {inventorySubItems.map((subItem) => (
              <Link key={subItem.path} to={subItem.path}
                className={`sidebar-subitem ${location.pathname === subItem.path ? 'active' : ''}`}
                onClick={onClose}>
                <span className="sidebar-sublabel">{subItem.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Item Master Section */}
        <div className="sidebar-section">
          <div
            className={`sidebar-item ${isItemMasterActive ? 'active' : ''}`}
            onClick={() => setItemMasterExpanded(!itemMasterExpanded)}
          >
            <span className="sidebar-icon"><img src={InventorySVG} alt='Item Master' /></span>
            <span className="sidebar-label">Item Master</span>
            <span className={`expand-icon ${itemMasterExpanded ? 'expanded' : ''}`}>▼</span>
          </div>
          <div className={`sidebar-subsection ${itemMasterExpanded ? 'expanded' : ''}`}>
            {itemMasterSubItems.map((subItem) => (
              <Link key={subItem.path} to={subItem.path}
                className={`sidebar-subitem ${location.pathname === subItem.path ? 'active' : ''}`}
                onClick={onClose}>
                <span className="sidebar-sublabel">{subItem.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Order Management Section */}
        <div className="sidebar-section">
          <div
            className={`sidebar-item ${isOrdersActive ? 'active' : ''}`}
            onClick={() => setOrdersExpanded(!ordersExpanded)}
          >
            <span className="sidebar-icon"><img src={OrderIcon} alt='Order Management' /></span>
            <span className="sidebar-label">Order Management</span>
            <span className={`expand-icon ${ordersExpanded ? 'expanded' : ''}`}>▼</span>
          </div>
          <div className={`sidebar-subsection ${ordersExpanded ? 'expanded' : ''}`}>
            {ordersSubItems.map((subItem) => (
              <Link key={subItem.path} to={subItem.path}
                className={`sidebar-subitem ${location.pathname === subItem.path ? 'active' : ''}`}
                onClick={onClose}>
                <span className="sidebar-sublabel">{subItem.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Subcontracting Section */}
        <div className="sidebar-section">
          <div
            className={`sidebar-item ${isSubcontractingActive ? 'active' : ''}`}
            onClick={() => setSubcontractingExpanded(!subcontractingExpanded)}
          >
            <span className="sidebar-icon"><img src={SubcontractIcon} alt='Subcontracting' /></span>
            <span className="sidebar-label">Subcontracting</span>
            <span className={`expand-icon ${subcontractingExpanded ? 'expanded' : ''}`}>▼</span>
          </div>
          <div className={`sidebar-subsection ${subcontractingExpanded ? 'expanded' : ''}`}>
            {subcontractingSubItems.map((subItem) => (
              <Link key={subItem.path} to={subItem.path}
                className={`sidebar-subitem ${location.pathname === subItem.path ? 'active' : ''}`}
                onClick={onClose}>
                <span className="sidebar-sublabel">{subItem.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Invoices Section */}
        <div className="sidebar-section">
          <div
            className={`sidebar-item ${isInvoicesActive ? 'active' : ''}`}
            onClick={() => setInvoicesExpanded(!invoicesExpanded)}
          >
            <span className="sidebar-icon"><img src={InvoiceIcon} alt='Invoices' /></span>
            <span className="sidebar-label">Invoices</span>
            <span className={`expand-icon ${invoicesExpanded ? 'expanded' : ''}`}>▼</span>
          </div>
          <div className={`sidebar-subsection ${invoicesExpanded ? 'expanded' : ''}`}>
            {invoicesSubItems.map((subItem) => (
              <Link key={subItem.path} to={subItem.path}
                className={`sidebar-subitem ${location.pathname === subItem.path ? 'active' : ''}`}
                onClick={onClose}>
                <span className="sidebar-sublabel">{subItem.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Payment Reminder Section */}
        <div className="sidebar-section">
          <div
            className={`sidebar-item ${isPaymentReminderActive ? 'active' : ''}`}
            onClick={() => setPaymentReminderExpanded(!paymentReminderExpanded)}
          >
            <span className="sidebar-icon"><img src={ReminderIcon} alt='Payment Reminder' /></span>
            <span className="sidebar-label">Payment Reminder</span>
            <span className={`expand-icon ${paymentReminderExpanded ? 'expanded' : ''}`}>▼</span>
          </div>
          <div className={`sidebar-subsection ${paymentReminderExpanded ? 'expanded' : ''}`}>
            {paymentReminderSubItems.map((subItem) => (
              <Link key={subItem.path} to={subItem.path}
                className={`sidebar-subitem ${location.pathname === subItem.path ? 'active' : ''}`}
                onClick={onClose}>
                <span className="sidebar-sublabel">{subItem.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Scrap Section */}
        <div className="sidebar-section">
          <div
            className={`sidebar-item ${isScrapActive ? 'active' : ''}`}
            onClick={() => setScrapExpanded(!scrapExpanded)}
          >
            <span className="sidebar-icon"><img src={SettingIcon} alt='Scrap' /></span>
            <span className="sidebar-label">Scrap</span>
            <span className={`expand-icon ${scrapExpanded ? 'expanded' : ''}`}>▼</span>
          </div>
          <div className={`sidebar-subsection ${scrapExpanded ? 'expanded' : ''}`}>
            {scrapSubItems.map((subItem) => (
              <Link key={subItem.path} to={subItem.path}
                className={`sidebar-subitem ${location.pathname === subItem.path ? 'active' : ''}`}
                onClick={onClose}>
                <span className="sidebar-sublabel">{subItem.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Settings */}
        <Link
          to="/settings"
          className={`sidebar-item ${location.pathname === '/settings' ? 'active' : ''}`}
          onClick={onClose}
        >
          <span className="sidebar-icon"><img src={SettingIcon} alt='Setting' /></span>
          <span className="sidebar-label">Setting</span>
        </Link>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">
            <span className="avatar-icon"><img src={ProfileSVG} alt="profile" /></span>
          </div>
          <span className="user-name">Admin</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
