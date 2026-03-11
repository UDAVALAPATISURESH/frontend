import React, { useState, useEffect } from 'react';
import './ShipmentsGrid.css';

const ShipmentsGrid = ({ shipments, onSort, sort, onAction, canEdit = true, canDelete = true }) => {
  const [openMenuId, setOpenMenuId] = useState(null);
  const getStatusColor = (status) => {
    switch (status) {
      case 'DELIVERED':
        return 'status-delivered';
      case 'IN_TRANSIT':
        return 'status-in-transit';
      case 'PENDING':
        return 'status-pending';
      case 'CANCELLED':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const handleSort = (field) => {
    onSort(field);
  };

  const SortIcon = ({ field }) => {
    if (sort.field !== field) return null;
    return <span className="sort-icon">{sort.order === 'ASC' ? '↑' : '↓'}</span>;
  };

  const handleMenuToggle = (e, shipmentId) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === shipmentId ? null : shipmentId);
  };

  const handleActionClick = (e, shipment, action) => {
    e.stopPropagation();
    setOpenMenuId(null);
    onAction(shipment, action);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
    };
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  return (
    <div className="shipments-grid-container">
      <div className="table-wrapper">
        <table className="shipments-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('trackingNumber')} className="sortable">
                Tracking Number <SortIcon field="trackingNumber" />
              </th>
              <th>Route (Where to Where)</th>
              <th onClick={() => handleSort('status')} className="sortable">
                Status <SortIcon field="status" />
              </th>
              <th onClick={() => handleSort('carrier')} className="sortable">
                Carrier <SortIcon field="carrier" />
              </th>
              <th onClick={() => handleSort('weight')} className="sortable">
                Weight (lbs) <SortIcon field="weight" />
              </th>
              <th>Dimensions</th>
              <th>Customer</th>
              <th onClick={() => handleSort('estimatedDelivery')} className="sortable">
                Est. Delivery <SortIcon field="estimatedDelivery" />
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shipments.length === 0 ? (
              <tr>
                <td colSpan="9" className="empty-state">
                  No shipments found
                </td>
              </tr>
            ) : (
              shipments.map((shipment) => (
                <tr key={shipment.id}>
                  <td className="tracking-number">{shipment.trackingNumber}</td>
                  <td>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                      borderRadius: 8,
                      border: '1px solid #bae6fd'
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0c4a6e' }}>📍 {shipment.origin}</span>
                      <span style={{ fontSize: 16, color: '#0284c7', fontWeight: 700 }}>→</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0c4a6e' }}>🎯 {shipment.destination}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusColor(shipment.status)}`}>
                      {shipment.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{shipment.carrier}</td>
                  <td>{shipment.weight}</td>
                  <td>{shipment.dimensions}</td>
                  <td>{shipment.customerName}</td>
                  <td>{formatDate(shipment.estimatedDelivery)}</td>
                  <td>
                    <div className="action-menu">
                      <button
                        className="action-button"
                        onClick={(e) => handleMenuToggle(e, shipment.id)}
                      >
                        ⋮
                      </button>
                      {openMenuId === shipment.id && (
                        <div className="action-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                          <button onClick={(e) => handleActionClick(e, shipment, 'view')}>
                            👁️ View Details
                          </button>
                          {canEdit && (
                            <button onClick={(e) => handleActionClick(e, shipment, 'edit')}>
                              ✏️ Edit
                            </button>
                          )}
                          <button onClick={(e) => handleActionClick(e, shipment, 'flag')}>
                            🚩 Flag
                          </button>
                          {canDelete && (
                            <button
                              onClick={(e) => handleActionClick(e, shipment, 'delete')}
                              className="delete-action"
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ShipmentsGrid;

