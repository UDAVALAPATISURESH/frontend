import React, { useState } from 'react';
import './ShipmentsTile.css';

const ShipmentsTile = ({ shipments, onTileClick, onAction, canEdit = true, canDelete = true }) => {
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

  const handleMenuToggle = (e, shipmentId) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === shipmentId ? null : shipmentId);
  };

  const handleActionClick = (e, shipment, action) => {
    e.stopPropagation();
    setOpenMenuId(null);
    onAction(shipment, action);
  };

  React.useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
    };
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  if (shipments.length === 0) {
    return (
      <div className="tiles-empty-state">
        <p>No shipments found</p>
      </div>
    );
  }

  return (
    <div className="shipments-tile-container">
      {shipments.map((shipment) => (
        <div
          key={shipment.id}
          className="shipment-tile"
          onClick={() => onTileClick(shipment)}
        >
          <div className="tile-header">
            <div className="tile-tracking">
              <span className="tracking-label">Tracking</span>
              <span className="tracking-number">{shipment.trackingNumber}</span>
            </div>
            <div className="tile-menu-wrapper">
              <button
                className="tile-menu-button"
                onClick={(e) => handleMenuToggle(e, shipment.id)}
              >
                ⋮
              </button>
              {openMenuId === shipment.id && (
                <div className="tile-menu-dropdown" onClick={(e) => e.stopPropagation()}>
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
          </div>

          <div className="tile-content">
            <div className="tile-route" style={{
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              padding: 16,
              borderRadius: 12,
              border: '2px solid #bae6fd',
              marginBottom: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#0ea5e9', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    📍 From
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0c4a6e', wordBreak: 'break-word' }}>
                    {shipment.origin}
                  </div>
                </div>
                <div style={{ fontSize: 28, color: '#0284c7', fontWeight: 700, flexShrink: 0 }}>→</div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#0ea5e9', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    🎯 To
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0c4a6e', wordBreak: 'break-word' }}>
                    {shipment.destination}
                  </div>
                </div>
              </div>
            </div>

            <div className="tile-info-grid">
              <div className="tile-info-item">
                <span className="info-label">Status</span>
                <span className={`info-value status-badge ${getStatusColor(shipment.status)}`}>
                  {shipment.status.replace('_', ' ')}
                </span>
              </div>
              <div className="tile-info-item">
                <span className="info-label">Carrier</span>
                <span className="info-value">{shipment.carrier}</span>
              </div>
              <div className="tile-info-item">
                <span className="info-label">Weight</span>
                <span className="info-value">{shipment.weight} lbs</span>
              </div>
              <div className="tile-info-item">
                <span className="info-label">Est. Delivery</span>
                <span className="info-value">{formatDate(shipment.estimatedDelivery)}</span>
              </div>
            </div>

            <div className="tile-footer">
              <span className="customer-name">{shipment.customerName}</span>
              <span className="tile-date">{formatDate(shipment.createdAt)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ShipmentsTile;

