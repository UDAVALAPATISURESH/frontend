import React from 'react';
import { useQuery, gql } from '@apollo/client';
import './AnalyticsView.css';

const SHIPMENTS_STATS_QUERY = gql`
  query GetShipmentsStats {
    shipments(page: 1, limit: 1000) {
      shipments {
        id
        status
        createdAt
        estimatedDelivery
        actualDelivery
      }
      totalCount
    }
  }
`;

const AnalyticsView = () => {
  const { data, loading, error } = useQuery(SHIPMENTS_STATS_QUERY);

  if (loading) {
    return (
      <div className="analytics-view">
        <div className="analytics-loading">
          <div className="loading-spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage = error.networkError 
      ? 'Network issue'
      : error.message || 'Error loading analytics';
    return (
      <div className="analytics-view">
        <div className="analytics-error">
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

  // Calculate delivery performance
  const deliveredShipments = shipments.filter(s => s.status === 'DELIVERED' && s.actualDelivery);
  const onTimeDeliveries = deliveredShipments.filter(s => {
    if (!s.estimatedDelivery || !s.actualDelivery) return false;
    return new Date(s.actualDelivery) <= new Date(s.estimatedDelivery);
  }).length;
  const onTimeRate = deliveredShipments.length > 0 
    ? ((onTimeDeliveries / deliveredShipments.length) * 100).toFixed(1)
    : 0;

  // Calculate pie chart data
  const pieData = [
    { label: 'Pending', value: pendingCount, color: '#f59e0b', percentage: totalCount > 0 ? (pendingCount / totalCount) * 100 : 0 },
    { label: 'In Transit', value: inTransitCount, color: '#3b82f6', percentage: totalCount > 0 ? (inTransitCount / totalCount) * 100 : 0 },
    { label: 'Delivered', value: deliveredCount, color: '#10b981', percentage: totalCount > 0 ? (deliveredCount / totalCount) * 100 : 0 }
  ];

  // Calculate line chart data (shipments over time - last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const last7DaysLabels = last7Days.map(date => 
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  );

  const shipmentsByDate = last7Days.map(date => {
    return shipments.filter(s => {
      if (!s.createdAt) return false;
      const createdDate = new Date(s.createdAt);
      createdDate.setHours(0, 0, 0, 0);
      return createdDate.getTime() === date.getTime();
    }).length;
  });

  const maxShipments = Math.max(...shipmentsByDate, 1) || 1;

  // Pie chart SVG
  const PieChart = () => {
    let currentAngle = -90;
    const radius = 80;
    const centerX = 100;
    const centerY = 100;

    return (
      <svg viewBox="0 0 200 200" className="pie-chart-svg">
        {pieData.map((item, index) => {
          if (item.value === 0) return null;
          const angle = (item.percentage / 100) * 360;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          currentAngle = endAngle;

          const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
          const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
          const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
          const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);
          const largeArc = angle > 180 ? 1 : 0;

          return (
            <path
              key={index}
              d={`M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={item.color}
              stroke="#fff"
              strokeWidth="2"
            />
          );
        })}
        <circle cx={centerX} cy={centerY} r={60} fill="white" />
        <text x={centerX} y={centerY - 5} textAnchor="middle" className="pie-center-text">
          {totalCount}
        </text>
        <text x={centerX} y={centerY + 15} textAnchor="middle" className="pie-center-label">
          Total
        </text>
      </svg>
    );
  };

  return (
    <div className="analytics-view">
      <div className="analytics-header">
        <h2>Analytics Dashboard</h2>
        <p className="analytics-subtitle">Overview of your shipment performance</p>
      </div>

      <div className="analytics-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>Total Shipments</h3>
            <p className="stat-value">{totalCount}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>Pending</h3>
            <p className="stat-value">{pendingCount}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚚</div>
          <div className="stat-content">
            <h3>In Transit</h3>
            <p className="stat-value">{inTransitCount}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Delivered</h3>
            <p className="stat-value">{deliveredCount}</p>
          </div>
        </div>

        <div className="stat-card stat-card-large">
          <div className="stat-content">
            <h3>On-Time Delivery Rate</h3>
            <div className="delivery-rate-circle">
              <div className="rate-circle" style={{ '--percentage': onTimeRate }}>
                <span className="rate-value">{onTimeRate}%</span>
              </div>
            </div>
            <p className="stat-desc">
              {onTimeDeliveries} of {deliveredShipments.length} deliveries on time
            </p>
          </div>
        </div>

        <div className="stat-card stat-card-large chart-card">
          <div className="stat-content">
            <h3>Status Distribution (Pie Chart)</h3>
            <div className="pie-chart-container">
              <PieChart />
              <div className="pie-legend">
                {pieData.map((item, index) => (
                  <div key={index} className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: item.color }}></span>
                    <span className="legend-label">{item.label}</span>
                    <span className="legend-value">{item.value} ({item.percentage.toFixed(1)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card stat-card-large chart-card">
          <div className="stat-content">
            <h3>Shipments Over Time (Last 7 Days)</h3>
            <div className="line-chart-container">
              <svg viewBox="0 0 400 200" className="line-chart-svg">
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#667eea" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#667eea" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polyline
                  points={shipmentsByDate.map((value, index) => {
                    const x = shipmentsByDate.length > 1 
                      ? (index / (shipmentsByDate.length - 1)) * 360 + 20 
                      : 200;
                    const y = 180 - (value / maxShipments) * 160;
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#667eea"
                  strokeWidth="3"
                  className="line-chart-line"
                />
                <polygon
                  points={`20,180 ${shipmentsByDate.map((value, index) => {
                    const x = shipmentsByDate.length > 1 
                      ? (index / (shipmentsByDate.length - 1)) * 360 + 20 
                      : 200;
                    const y = 180 - (value / maxShipments) * 160;
                    return `${x},${y}`;
                  }).join(' ')} 380,180`}
                  fill="url(#lineGradient)"
                />
                {shipmentsByDate.map((value, index) => {
                  const x = shipmentsByDate.length > 1 
                    ? (index / (shipmentsByDate.length - 1)) * 360 + 20 
                    : 200;
                  const y = 180 - (value / maxShipments) * 160;
                  return (
                    <g key={index}>
                      <circle cx={x} cy={y} r="4" fill="#667eea" />
                      <text x={x} y="195" textAnchor="middle" className="line-chart-label" fontSize="10">
                        {last7DaysLabels[index].split(' ')[1]}
                      </text>
                      <text x={x} y={y - 10} textAnchor="middle" className="line-chart-value" fontSize="12" fontWeight="600">
                        {value}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        <div className="stat-card stat-card-large">
          <div className="stat-content">
            <h3>Status Distribution (Bar Chart)</h3>
            <div className="status-chart">
              <div className="chart-bar">
                <div className="chart-label">Pending</div>
                <div className="chart-bar-container">
                  <div 
                    className="chart-bar-fill pending" 
                    style={{ width: `${totalCount > 0 ? (pendingCount / totalCount) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="chart-value">{pendingCount}</div>
              </div>
              <div className="chart-bar">
                <div className="chart-label">In Transit</div>
                <div className="chart-bar-container">
                  <div 
                    className="chart-bar-fill in-transit" 
                    style={{ width: `${totalCount > 0 ? (inTransitCount / totalCount) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="chart-value">{inTransitCount}</div>
              </div>
              <div className="chart-bar">
                <div className="chart-label">Delivered</div>
                <div className="chart-bar-container">
                  <div 
                    className="chart-bar-fill delivered" 
                    style={{ width: `${totalCount > 0 ? (deliveredCount / totalCount) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="chart-value">{deliveredCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;

