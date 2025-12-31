import React from 'react';
import { useQuery, gql } from '@apollo/client';
import './HomeView.css';

const SHIPMENTS_STATS_QUERY = gql`
  query GetShipmentsStats {
    shipments(page: 1, limit: 100) {
      shipments {
        id
        trackingNumber
        status
        origin
        destination
        createdAt
      }
      totalCount
    }
  }
`;

const HomeView = ({ onNavigate }) => {
  // const { user } = useAuth(); // Removed unused variable
  const { data, loading, error } = useQuery(SHIPMENTS_STATS_QUERY);

  if (loading) {
    return (
      <div className="home-view">
        <div className="home-loading">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage = error.networkError 
      ? 'Network issue'
      : error.message || 'Error loading data';
    return (
      <div className="home-view">
        <div className="home-error">
          <p>{errorMessage}</p>
          {error.networkError && (
            <button onClick={() => window.location.reload()} style={{ marginTop: '16px', padding: '8px 16px' }}>
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  const shipments = data?.shipments?.shipments || [];
  const totalCount = data?.shipments?.totalCount || 0;

  // Calculate statistics
  const statusCounts = shipments.reduce((acc, shipment) => {
    acc[shipment.status] = (acc[shipment.status] || 0) + 1;
    return acc;
  }, {});

  const pendingCount = statusCounts.PENDING || 0;
  const inTransitCount = statusCounts.IN_TRANSIT || 0;
  const deliveredCount = statusCounts.DELIVERED || 0;

  // Get recent shipments
  const recentShipments = shipments.slice(0, 5);

  return (
    <div className="home-view">
      <div className="home-stats-grid">
        <div className="home-stat-card">
          <div className="stat-card-icon shipments">📦</div>
          <div className="stat-card-content">
            <h3>Total Shipments</h3>
            <p className="stat-card-value">{totalCount}</p>
            <p className="stat-card-change">All time shipments</p>
          </div>
        </div>

        <div className="home-stat-card">
          <div className="stat-card-icon pending">⏳</div>
          <div className="stat-card-content">
            <h3>Pending</h3>
            <p className="stat-card-value">{pendingCount}</p>
            <p className="stat-card-change">Awaiting processing</p>
          </div>
        </div>

        <div className="home-stat-card">
          <div className="stat-card-icon transit">🚚</div>
          <div className="stat-card-content">
            <h3>In Transit</h3>
            <p className="stat-card-value">{inTransitCount}</p>
            <p className="stat-card-change">On the way</p>
          </div>
        </div>

        <div className="home-stat-card">
          <div className="stat-card-icon delivered">✅</div>
          <div className="stat-card-content">
            <h3>Delivered</h3>
            <p className="stat-card-value">{deliveredCount}</p>
            <p className="stat-card-change">Successfully completed</p>
          </div>
        </div>
      </div>

      <div className="home-content-grid">
        <div className="home-card">
          <div className="home-card-header">
            <h2>Recent Shipments</h2>
            <button className="view-all-btn" onClick={() => onNavigate && onNavigate('shipments')}>
              View All →
            </button>
          </div>
          <div className="recent-shipments-list">
            {recentShipments.length > 0 ? (
              recentShipments.map((shipment) => (
                <div key={shipment.id} className="recent-shipment-item">
                  <div className="shipment-info">
                    <span className="shipment-tracking">{shipment.trackingNumber}</span>
                    <span className="shipment-route">
                      {shipment.origin} → {shipment.destination}
                    </span>
                  </div>
                  <span className={`shipment-status status-${shipment.status.toLowerCase().replace('_', '-')}`}>
                    {shipment.status.replace('_', ' ')}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No shipments yet. Create your first shipment to get started!</p>
              </div>
            )}
          </div>
        </div>

        <div className="home-card">
          <div className="home-card-header">
            <h2>Shipment Overview</h2>
          </div>
          <div className="chart-container">
            <div className="simple-chart">
              <div className="chart-bars">
                <div className="chart-bar-item">
                  <div className="chart-bar-label">Pending</div>
                  <div className="chart-bar-wrapper">
                    <div 
                      className="chart-bar-fill pending" 
                      style={{ width: `${totalCount > 0 ? (pendingCount / totalCount) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <div className="chart-bar-value">{pendingCount}</div>
                </div>
                <div className="chart-bar-item">
                  <div className="chart-bar-label">In Transit</div>
                  <div className="chart-bar-wrapper">
                    <div 
                      className="chart-bar-fill transit" 
                      style={{ width: `${totalCount > 0 ? (inTransitCount / totalCount) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <div className="chart-bar-value">{inTransitCount}</div>
                </div>
                <div className="chart-bar-item">
                  <div className="chart-bar-label">Delivered</div>
                  <div className="chart-bar-wrapper">
                    <div 
                      className="chart-bar-fill delivered" 
                      style={{ width: `${totalCount > 0 ? (deliveredCount / totalCount) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <div className="chart-bar-value">{deliveredCount}</div>
                </div>
              </div>
              <div className="chart-total">
                <span className="total-label">Total:</span>
                <span className="total-value">{totalCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeView;

