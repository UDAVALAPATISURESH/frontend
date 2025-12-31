import React, { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import './ReportsView.css';

const SHIPMENTS_QUERY = gql`
  query GetShipmentsForReport($filter: ShipmentFilter) {
    shipments(page: 1, limit: 1000, filter: $filter) {
      shipments {
        id
        trackingNumber
        origin
        destination
        status
        carrier
        customerName
        customerEmail
        createdAt
        estimatedDelivery
        actualDelivery
      }
      totalCount
    }
  }
`;

const ReportsView = () => {
  const [reportType, setReportType] = useState('all');
  const [dateRange, setDateRange] = useState('week');

  const { data, loading, error } = useQuery(SHIPMENTS_QUERY, {
    variables: {
      filter: reportType !== 'all' ? { status: reportType } : null
    }
  });

  const shipments = data?.shipments?.shipments || [];
  const totalCount = data?.shipments?.totalCount || 0;

  const handleExport = (format) => {
    // Create CSV content
    const headers = ['Tracking Number', 'Origin', 'Destination', 'Status', 'Carrier', 'Customer Name', 'Customer Email', 'Created At', 'Estimated Delivery', 'Actual Delivery'];
    const rows = shipments.map(s => [
      s.trackingNumber || '',
      s.origin || '',
      s.destination || '',
      s.status || '',
      s.carrier || '',
      s.customerName || '',
      s.customerEmail || '',
      s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '',
      s.estimatedDelivery ? new Date(s.estimatedDelivery).toLocaleDateString() : '',
      s.actualDelivery ? new Date(s.actualDelivery).toLocaleDateString() : ''
    ]);

    if (format === 'csv') {
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shipments-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (format === 'json') {
      const jsonContent = JSON.stringify(shipments, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shipments-report-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="reports-view">
        <div className="reports-loading">
          <div className="loading-spinner"></div>
          <p>Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports-view">
        <div className="reports-error">
          <p>Error loading reports: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-view">
      <div className="reports-header">
        <div>
          <h2>Reports</h2>
          <p className="reports-subtitle">Generate and export shipment reports</p>
        </div>
        <div className="report-actions">
          <button className="export-button" onClick={() => handleExport('csv')}>
            📥 Export CSV
          </button>
          <button className="export-button" onClick={() => handleExport('json')}>
            📥 Export JSON
          </button>
        </div>
      </div>

      <div className="report-filters-visible">
        <div className="filter-buttons-group">
          <label className="filter-label">Report Type:</label>
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${reportType === 'all' ? 'active' : ''}`}
              onClick={() => setReportType('all')}
            >
              All Shipments
            </button>
            <button 
              className={`filter-btn ${reportType === 'PENDING' ? 'active' : ''}`}
              onClick={() => setReportType('PENDING')}
            >
              Pending
            </button>
            <button 
              className={`filter-btn ${reportType === 'IN_TRANSIT' ? 'active' : ''}`}
              onClick={() => setReportType('IN_TRANSIT')}
            >
              In Transit
            </button>
            <button 
              className={`filter-btn ${reportType === 'DELIVERED' ? 'active' : ''}`}
              onClick={() => setReportType('DELIVERED')}
            >
              Delivered
            </button>
          </div>
        </div>
        <div className="filter-buttons-group">
          <label className="filter-label">Date Range:</label>
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${dateRange === 'week' ? 'active' : ''}`}
              onClick={() => setDateRange('week')}
            >
              Last Week
            </button>
            <button 
              className={`filter-btn ${dateRange === 'month' ? 'active' : ''}`}
              onClick={() => setDateRange('month')}
            >
              Last Month
            </button>
            <button 
              className={`filter-btn ${dateRange === 'quarter' ? 'active' : ''}`}
              onClick={() => setDateRange('quarter')}
            >
              Last Quarter
            </button>
            <button 
              className={`filter-btn ${dateRange === 'year' ? 'active' : ''}`}
              onClick={() => setDateRange('year')}
            >
              Last Year
            </button>
            <button 
              className={`filter-btn ${dateRange === 'all' ? 'active' : ''}`}
              onClick={() => setDateRange('all')}
            >
              All Time
            </button>
          </div>
        </div>
      </div>

      <div className="report-summary">
        <div className="summary-card">
          <h3>Total Records</h3>
          <p className="summary-value">{totalCount}</p>
        </div>
        <div className="summary-card">
          <h3>Report Type</h3>
          <p className="summary-value">{reportType === 'all' ? 'All Shipments' : reportType.replace('_', ' ')}</p>
        </div>
        <div className="summary-card">
          <h3>Date Range</h3>
          <p className="summary-value">{dateRange === 'all' ? 'All Time' : dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}</p>
        </div>
      </div>

      <div className="report-preview">
        <h3>Report Preview</h3>
        <div className="preview-table-container">
          <table className="preview-table">
            <thead>
              <tr>
                <th>Tracking #</th>
                <th>Origin</th>
                <th>Destination</th>
                <th>Status</th>
                <th>Carrier</th>
                <th>Customer</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {shipments.slice(0, 10).map((shipment) => (
                <tr key={shipment.id}>
                  <td>{shipment.trackingNumber}</td>
                  <td>{shipment.origin}</td>
                  <td>{shipment.destination}</td>
                  <td>
                    <span className={`status-badge status-${shipment.status.toLowerCase().replace('_', '-')}`}>
                      {shipment.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{shipment.carrier || 'N/A'}</td>
                  <td>{shipment.customerName || 'N/A'}</td>
                  <td>{shipment.createdAt ? new Date(shipment.createdAt).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {shipments.length > 10 && (
            <p className="preview-note">Showing first 10 of {totalCount} records. Export to see all data.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsView;

