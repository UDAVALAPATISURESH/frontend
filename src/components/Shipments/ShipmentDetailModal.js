import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';
import { hasScope, SCOPES } from '../../utils/permissions';
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal';
import './ShipmentDetailModal.css';

const UPDATE_SHIPMENT_MUTATION = gql`
  mutation UpdateShipment($input: UpdateShipmentInput!) {
    updateShipment(input: $input) {
      id
      trackingNumber
      origin
      destination
      status
      carrier
      weight
      dimensions
      estimatedDelivery
      actualDelivery
      customerName
      customerEmail
      creatorEmail
      createdAt
      updatedAt
    }
  }
`;

const DELETE_SHIPMENT_MUTATION = gql`
  mutation DeleteShipment($id: ID!) {
    deleteShipment(id: $id)
  }
`;

const ShipmentDetailModal = ({ shipment, onClose, onUpdate, initialEditMode = false, initialDeleteMode = false }) => {
  const { user } = useAuth();
  const canEdit = hasScope(user, SCOPES.EDIT_SHIPMENTS);
  const canDelete = hasScope(user, SCOPES.DELETE_SHIPMENTS);
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [formData, setFormData] = useState({
    trackingNumber: shipment.trackingNumber,
    origin: shipment.origin,
    destination: shipment.destination,
    status: shipment.status,
    carrier: shipment.carrier,
    weight: shipment.weight,
    dimensions: shipment.dimensions,
    estimatedDelivery: shipment.estimatedDelivery ? shipment.estimatedDelivery.split('T')[0] : '',
    actualDelivery: shipment.actualDelivery ? shipment.actualDelivery.split('T')[0] : '',
    customerName: shipment.customerName,
    customerEmail: shipment.customerEmail,
  });

  const [updateError, setUpdateError] = useState('');
  const [updateShipment, { loading: updating }] = useMutation(UPDATE_SHIPMENT_MUTATION, {
    onCompleted: () => {
      setIsEditing(false);
      onUpdate();
      setUpdateError('');
    },
    onError: (error) => {
      if (error.networkError) {
        setUpdateError('Network issue');
      } else {
        setUpdateError(error.message || 'Failed to update shipment');
      }
    },
  });

  const [deleteError, setDeleteError] = useState('');
  const [deleteShipment, { loading: deleting }] = useMutation(DELETE_SHIPMENT_MUTATION, {
    onCompleted: () => {
      onClose();
      onUpdate();
      setShowDeleteConfirm(false);
      setDeleteError('');
    },
    onError: (error) => {
      if (error.networkError) {
        setDeleteError('Network issue');
      } else {
        setDeleteError(error.message || 'Failed to delete shipment');
      }
    },
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    const updateInput = {
      id: shipment.id,
      ...formData,
      weight: parseFloat(formData.weight) || 0,
    };

    // Only include dates if they have values
    if (formData.estimatedDelivery) {
      updateInput.estimatedDelivery = `${formData.estimatedDelivery}T00:00:00.000Z`;
    }
    if (formData.actualDelivery) {
      updateInput.actualDelivery = `${formData.actualDelivery}T00:00:00.000Z`;
    }

    updateShipment({
      variables: {
        input: updateInput,
      },
    });
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(initialDeleteMode || false);

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    deleteShipment({ variables: { id: shipment.id } });
    setShowDeleteConfirm(false);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

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
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Shipment Details</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {updateError && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{updateError}</span>
            </div>
          )}
          {isEditing ? (
            <div className="edit-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Tracking Number</label>
                  <input
                    type="text"
                    name="trackingNumber"
                    value={formData.trackingNumber}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange}>
                    <option value="PENDING">Pending</option>
                    <option value="IN_TRANSIT">In Transit</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Origin</label>
                  <input
                    type="text"
                    name="origin"
                    value={formData.origin}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Destination</label>
                  <input
                    type="text"
                    name="destination"
                    value={formData.destination}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Carrier</label>
                  <input
                    type="text"
                    name="carrier"
                    value={formData.carrier}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Weight (lbs)</label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    step="0.01"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Dimensions</label>
                  <input
                    type="text"
                    name="dimensions"
                    value={formData.dimensions}
                    onChange={handleInputChange}
                    placeholder="LxWxH"
                  />
                </div>
                <div className="form-group">
                  <label>Estimated Delivery</label>
                  <input
                    type="date"
                    name="estimatedDelivery"
                    value={formData.estimatedDelivery}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Actual Delivery</label>
                  <input
                    type="date"
                    name="actualDelivery"
                    value={formData.actualDelivery}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Customer Name</label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label>Customer Email</label>
                  <input
                    type="email"
                    name="customerEmail"
                    value={formData.customerEmail}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="detail-view">
              <div className="detail-section">
                <h3>Tracking Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Tracking Number</span>
                    <span className="detail-value tracking-number">{shipment.trackingNumber}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status</span>
                    <span className={`detail-value status-badge ${getStatusColor(shipment.status)}`}>
                      {shipment.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Route Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Origin</span>
                    <span className="detail-value">{shipment.origin}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Destination</span>
                    <span className="detail-value">{shipment.destination}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Shipping Details</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Carrier</span>
                    <span className="detail-value">{shipment.carrier}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Weight</span>
                    <span className="detail-value">{shipment.weight} lbs</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Dimensions</span>
                    <span className="detail-value">{shipment.dimensions}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Delivery Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Estimated Delivery</span>
                    <span className="detail-value">{formatDate(shipment.estimatedDelivery)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Actual Delivery</span>
                    <span className="detail-value">{formatDate(shipment.actualDelivery)}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Customer Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Customer Name</span>
                    <span className="detail-value">{shipment.customerName}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Customer Email</span>
                    <span className="detail-value">{shipment.customerEmail}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Created By</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Creator Email</span>
                    <span className="detail-value">{shipment.creatorEmail || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Timestamps</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Created At</span>
                    <span className="detail-value">{formatDate(shipment.createdAt)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Last Updated</span>
                    <span className="detail-value">{formatDate(shipment.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {isEditing ? (
            <>
              <button className="cancel-button" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button className="save-button" onClick={handleSave} disabled={updating}>
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              {canDelete && (
                <button className="delete-button" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              )}
              {canEdit && (
                <button className="edit-button" onClick={() => setIsEditing(true)}>
                  Edit
                </button>
              )}
              <button className="close-footer-button" onClick={onClose}>
                Close
              </button>
            </>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <>
          <DeleteConfirmationModal
            isOpen={true}
            onClose={handleDeleteCancel}
            onConfirm={handleDeleteConfirm}
            title="Delete Shipment"
            message={`Are you sure you want to delete shipment "${shipment.trackingNumber}"?`}
            itemName={shipment.trackingNumber}
            loading={deleting}
          />
          {deleteError && (
            <div className="delete-error-message">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{deleteError}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ShipmentDetailModal;

