import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, LogOut } from 'lucide-react';
import './Header.css';

const Header = ({ onMenuClick, user, setActiveView }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };


  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-button" onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        {/* <div className="header-profile-badge">
          <div className="header-profile-avatar">👨‍💼</div>
        </div> */}
        <div className="header-welcome">
          <h1 className="header-welcome-title">Welcome back, {user?.username || 'admin'}! 👋</h1>
          <p className="header-welcome-subtitle">Here's what's happening with your shipments today</p>
        </div>
      </div>

      <div className="header-middle">
        <div className="header-search-container">
          <span className="search-icon"><Search size={18} /></span>
          <input
            type="text"
            placeholder="Search shipments..."
            className="header-search-input"
          />
        </div>
      </div>

      <div className="header-right">
        <div className="header-login-info">
          <span className="login-time-label">Last login:</span>
          <span className="login-time-value">
            {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="user-menu">
          <button className="logout-button" onClick={handleLogout} title="Logout" aria-label="Logout">
            <span className="logout-icon"><LogOut size={18} /></span>
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

