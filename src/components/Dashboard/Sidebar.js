import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { hasScope, SCOPES, isAdmin } from '../../utils/permissions';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose, setActiveView, activeView }) => {
  const { user } = useAuth();

  // Define base menu items
  const menuItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'shipments', label: 'Shipments', icon: '📦', requiredScope: SCOPES.VIEW_SHIPMENTS },
    { id: 'liveTracker', label: 'Live Tracker', icon: '📍', requiredScope: SCOPES.VIEW_SHIPMENTS },
    { id: 'analytics', label: 'Analytics', icon: '📊', requiredScope: SCOPES.VIEW_ANALYTICS },
    { id: 'reports', label: 'Reports', icon: '📄', requiredScope: SCOPES.VIEW_REPORTS },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  // Filter items by scopes for non-admin users
  const visibleMenuItems = menuItems.filter((item) => {
    // Home and Settings are always visible
    if (!item.requiredScope) return true;
    // Admins see everything
    if (isAdmin(user)) return true;
    // Employees must have the specific scope
    return hasScope(user, item.requiredScope);
  });
  
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
              src="https://res.cloudinary.com/dkjkisdph/image/upload/v1771856045/ChatGPT_Image_Feb_23_2026_07_43_46_PM_jdjg1u.png" 
              alt="Brand Logo" 
              className="brand-logo"
            />
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <nav className="sidebar-nav">
          {visibleMenuItems.map((item) => (
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
          
          {/* Admin / user-management menu item - visible for ADMIN role or MANAGE_USERS scope */}
          {(isAdmin(user) || hasScope(user, SCOPES.MANAGE_USERS)) && (
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
                <span className="nav-label">Admin</span>
                  </div>
            </div>
          )}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;

