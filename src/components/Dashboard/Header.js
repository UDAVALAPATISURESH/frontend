import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
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
          ☰
        </button>
        <div className="header-welcome">
          <h1 className="header-welcome-title">Welcome back, {user?.username || 'User'}! 👋</h1>
          <p className="header-welcome-subtitle">Here's what's happening with your shipments today</p>
        </div>
      </div>
      <div className="header-right">
        <div className="user-menu">
          <button className="logout-button" onClick={handleLogout} title="Logout" aria-label="Logout">
            <span className="logout-icon">🚪</span>
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

