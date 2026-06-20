import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

const SHORTCUTS = [
  { keys: ['Ctrl', 'B'],       description: 'Toggle sidebar' },
  { keys: ['Ctrl', 'D'],       description: 'Go to Dashboard' },
  { keys: ['Ctrl', 'J'],       description: 'Go to Cashflow' },
  { keys: ['Ctrl', 'Shift', 'C'], description: 'Go to CRM & Sales' },
  { keys: ['Ctrl', 'Shift', 'P'], description: 'Go to Party Master' },
  { keys: ['Ctrl', 'Shift', 'I'], description: 'Go to Inventory' },
  { keys: ['Ctrl', 'Shift', 'O'], description: 'Go to Orders' },
  { keys: ['Ctrl', 'Shift', 'E'], description: 'Go to Electric' },
  { keys: ['Ctrl', 'Shift', 'G'], description: 'Go to Casting' },
  { keys: ['Ctrl', 'Shift', 'F'], description: 'Go to Forging' },
  { keys: ['Ctrl', 'Shift', 'U'], description: 'Go to Purchase' },
  { keys: ['Ctrl', 'Shift', 'R'], description: 'Go to Rejection' },
  { keys: ['?'],               description: 'Show this shortcuts help' },
  { keys: ['Esc'],             description: 'Close shortcuts panel' },
];

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const navigate = useNavigate();

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    // Escape — close shortcuts panel
    if (e.key === 'Escape') {
      setShowShortcuts(false);
      return;
    }

    // ? — show shortcuts (only when not typing)
    if (e.key === '?' && !inInput && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      setShowShortcuts(prev => !prev);
      return;
    }

    if (!e.ctrlKey) return;

    // Ctrl+B — toggle sidebar
    if (e.key === 'b' || e.key === 'B') {
      e.preventDefault();
      setSidebarOpen(prev => !prev);
      return;
    }

    // Ctrl+D — Dashboard
    if (e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      navigate('/dashboard');
      return;
    }

    // Ctrl+J — Cashflow
    if (e.key === 'j' || e.key === 'J') {
      e.preventDefault();
      navigate('/cashflow');
      return;
    }

    // Ctrl+Shift combos for page navigation
    if (e.shiftKey) {
      switch (e.key) {
        case 'C': e.preventDefault(); navigate('/crm');                        break;
        case 'P': e.preventDefault(); navigate('/party-master');               break;
        case 'I': e.preventDefault(); navigate('/inventory/ground-floor');     break;
        case 'O': e.preventDefault(); navigate('/orders/ground-floor');        break;
        case 'E': e.preventDefault(); navigate('/electric');                   break;
        case 'G': e.preventDefault(); navigate('/casting');                    break;
        case 'F': e.preventDefault(); navigate('/forging');                    break;
        case 'U': e.preventDefault(); navigate('/purchase');                   break;
        case 'R': e.preventDefault(); navigate('/rejection');                  break;
      }
    }
  }, [navigate]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="layout">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className={`main-content${sidebarOpen ? '' : ' sidebar-collapsed'}`}>
        <Header onMenuClick={toggleSidebar} />
        <div className="content">
          <Outlet />
        </div>
      </div>

      {/* Overlay only visible on mobile via CSS */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      {/* Keyboard shortcuts floating button */}
      <button
        className="shortcuts-fab"
        onClick={() => setShowShortcuts(prev => !prev)}
        title="Keyboard shortcuts (?)"
      >
        ⌨
      </button>

      {/* Shortcuts overlay */}
      {showShortcuts && (
        <div className="shortcuts-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="shortcuts-modal" onClick={e => e.stopPropagation()}>
            <div className="shortcuts-modal-header">
              <span className="shortcuts-modal-title">Keyboard Shortcuts</span>
              <button className="shortcuts-modal-close" onClick={() => setShowShortcuts(false)}>✕</button>
            </div>
            <div className="shortcuts-list">
              {SHORTCUTS.map((s, i) => (
                <div key={i} className="shortcut-row">
                  <div className="shortcut-keys">
                    {s.keys.map((k, ki) => (
                      <React.Fragment key={ki}>
                        <kbd className="shortcut-key">{k}</kbd>
                        {ki < s.keys.length - 1 && <span className="shortcut-plus">+</span>}
                      </React.Fragment>
                    ))}
                  </div>
                  <span className="shortcut-desc">{s.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
