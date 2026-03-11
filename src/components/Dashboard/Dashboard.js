import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import HomeView from '../Home/HomeView';
import ShipmentsView from '../Shipments/ShipmentsView';
import UsersView from '../Users/UsersView';
import AnalyticsView from '../Analytics/AnalyticsView';
import ReportsView from '../Reports/ReportsView';
import SettingsView from '../Settings/SettingsView';
import LiveTrackerView from '../Tracker/LiveTrackerView';
import './Dashboard.css';

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState('home');
  const [shipmentFilter, setShipmentFilter] = useState(null);
  const { user } = useAuth();
  

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleViewChange = (view) => {
    // Handle both string and object views
    if (typeof view === 'object' && view.view) {
      setActiveView(view.view);
      if (view.filter !== undefined) {
        setShipmentFilter(view.filter);
      }
    } else {
      setActiveView(view);
      setShipmentFilter(null);
    }
  };

  // Get the current view ID for sidebar highlighting
  const currentViewId = typeof activeView === 'object' ? activeView.view : activeView;

  return (
    <div className="dashboard-container">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        setActiveView={handleViewChange}
        activeView={currentViewId}
      />
      <div className="dashboard-main">
        <Header onMenuClick={toggleSidebar} user={user} setActiveView={handleViewChange} />
        <div className="dashboard-content">
          {activeView === 'home' && <HomeView onNavigate={handleViewChange} />}
          {(activeView === 'shipments' || currentViewId === 'shipments') && (
            <ShipmentsView statusFilter={shipmentFilter} />
          )}
          {activeView === 'users' && <UsersView />}
          {activeView === 'liveTracker' && <LiveTrackerView />}
          {activeView === 'analytics' && <AnalyticsView />}
          {activeView === 'reports' && <ReportsView />}
          {activeView === 'settings' && <SettingsView />}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

