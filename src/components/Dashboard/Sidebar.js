import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose, setActiveView, activeView }) => {
  const { user } = useAuth();

  const menuItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'shipments', label: 'Shipments', icon: '📦' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'reports', label: 'Reports', icon: '📄' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];
  
  // Get current view ID (handle both string and object)
  const currentViewId = typeof activeView === 'object' ? activeView.view : activeView;

  const handleItemClick = (itemId) => {
    if (typeof setActiveView === 'function') {
    setActiveView(itemId);
    }
    // Close sidebar on mobile after selection
    if (window.innerWidth < 768) {
      setTimeout(() => onClose(), 100);
    }
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-logo-container">
            <img 
              src="https://shinelogisticsllc.com/wp-content/uploads/2023/01/Asset-109.png" 
              alt="Brand Logo" 
              className="brand-logo"
            />
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <div key={item.id} className="nav-item">
              <div
                className={`nav-item-header ${currentViewId === item.id ? 'active' : ''}`}
                onClick={() => handleItemClick(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </div>
            </div>
          ))}
          
          {/* Admin-only menu items - moved to main menu */}
          {user?.role === 'ADMIN' && (
            <div className="nav-item">
                  <div
                className={`nav-item-header ${activeView === 'users' ? 'active' : ''}`}
                    onClick={() => {
                  if (typeof setActiveView === 'function') {
                    setActiveView('users');
                  }
                      onClose();
                    }}
                  >
                <span className="nav-icon">👥</span>
                <span className="nav-label">User Management</span>
                  </div>
            </div>
          )}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;

