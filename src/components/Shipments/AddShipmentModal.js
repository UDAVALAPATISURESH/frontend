import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import './AddShipmentModal.css';

const ADD_SHIPMENT_MUTATION = gql`
  mutation AddShipment($input: ShipmentInput!) {
    addShipment(input: $input) {
      id
      trackingNumber
      origin
      destination
      status
      carrier
      weight
      dimensions
      estimatedDelivery
      customerName
      customerEmail
      creatorEmail
    }
  }
`;

const AddShipmentModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    trackingNumber: '',
    origin: '',
    destination: '',
    status: 'PENDING',
    carrier: '',
    weight: '',
    dimensions: '',
    estimatedDelivery: '',
    customerName: '',
    customerEmail: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [addShipment, { loading }] = useMutation(ADD_SHIPMENT_MUTATION, {
    onCompleted: () => {
      onSuccess();
    },
    onError: (error) => {
      const errorMessage = error.networkError 
        ? 'Network issue'
        : error.message || 'Error adding shipment';
      setError(errorMessage);
    },
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.trackingNumber || formData.trackingNumber.trim() === '') {
      errors.trackingNumber = 'Tracking number is required';
    }
    if (!formData.origin || formData.origin.trim() === '') {
      errors.origin = 'Origin is required';
    }
    if (!formData.destination || formData.destination.trim() === '') {
      errors.destination = 'Destination is required';
    }
    if (!formData.carrier || formData.carrier.trim() === '') {
      errors.carrier = 'Carrier is required';
    }
    if (!formData.customerName || formData.customerName.trim() === '') {
      errors.customerName = 'Customer name is required';
    }
    if (!formData.customerEmail || formData.customerEmail.trim() === '') {
      errors.customerEmail = 'Customer email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.customerEmail.trim())) {
        errors.customerEmail = 'Please enter a valid email address';
      }
    }
    if (!formData.weight || parseFloat(formData.weight) <= 0) {
      errors.weight = 'Weight must be greater than 0';
    }
    if (!formData.dimensions || formData.dimensions.trim() === '') {
      errors.dimensions = 'Dimensions are required';
    }
    if (!formData.estimatedDelivery) {
      errors.estimatedDelivery = 'Estimated delivery date is required';
    }
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    addShipment({
      variables: {
        input: {
          ...formData,
          weight: parseFloat(formData.weight) || 0,
          estimatedDelivery: formData.estimatedDelivery
            ? `${formData.estimatedDelivery}T00:00:00.000Z`
            : new Date().toISOString(), // Default to today if not provided
        },
      },
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Shipment</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="add-shipment-form">
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error}</span>
            </div>
          )}
          <div className="form-section">
            <h3>Tracking Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Tracking Number *</label>
                <input
                  type="text"
                  name="trackingNumber"
                  value={formData.trackingNumber}
                  onChange={handleInputChange}
                  className={fieldErrors.trackingNumber ? 'input-error' : ''}
                  placeholder="TRK000001"
                />
                {fieldErrors.trackingNumber && (
                  <span className="field-error-message">{fieldErrors.trackingNumber}</span>
                )}
              </div>
              <div className="form-group">
                <label>Status *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_TRANSIT">In Transit</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Route Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Origin *</label>
                <input
                  type="text"
                  name="origin"
                  value={formData.origin}
                  onChange={handleInputChange}
                  className={fieldErrors.origin ? 'input-error' : ''}
                  placeholder="New York"
                />
                {fieldErrors.origin && (
                  <span className="field-error-message">{fieldErrors.origin}</span>
                )}
              </div>
              <div className="form-group">
                <label>Destination *</label>
                <input
                  type="text"
                  name="destination"
                  value={formData.destination}
                  onChange={handleInputChange}
                  className={fieldErrors.destination ? 'input-error' : ''}
                  placeholder="Los Angeles"
                />
                {fieldErrors.destination && (
                  <span className="field-error-message">{fieldErrors.destination}</span>
                )}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Shipping Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Carrier *</label>
                <input
                  type="text"
                  name="carrier"
                  value={formData.carrier}
                  onChange={handleInputChange}
                  className={fieldErrors.carrier ? 'input-error' : ''}
                  placeholder="FedEx, UPS, DHL..."
                />
                {fieldErrors.carrier && (
                  <span className="field-error-message">{fieldErrors.carrier}</span>
                )}
              </div>
              <div className="form-group">
                <label>Weight (lbs) *</label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  className={fieldErrors.weight ? 'input-error' : ''}
                  step="0.01"
                  min="0"
                  placeholder="10.5"
                />
                {fieldErrors.weight && (
                  <span className="field-error-message">{fieldErrors.weight}</span>
                )}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Dimensions *</label>
                <input
                  type="text"
                  name="dimensions"
                  value={formData.dimensions}
                  onChange={handleInputChange}
                  className={fieldErrors.dimensions ? 'input-error' : ''}
                  placeholder="10x10x10"
                />
                {fieldErrors.dimensions && (
                  <span className="field-error-message">{fieldErrors.dimensions}</span>
                )}
              </div>
              <div className="form-group">
                <label>Estimated Delivery *</label>
                <input
                  type="date"
                  name="estimatedDelivery"
                  value={formData.estimatedDelivery}
                  onChange={handleInputChange}
                  className={fieldErrors.estimatedDelivery ? 'input-error' : ''}
                />
                {fieldErrors.estimatedDelivery && (
                  <span className="field-error-message">{fieldErrors.estimatedDelivery}</span>
                )}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Customer Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Customer Name *</label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  className={fieldErrors.customerName ? 'input-error' : ''}
                  placeholder="John Doe"
                />
                {fieldErrors.customerName && (
                  <span className="field-error-message">{fieldErrors.customerName}</span>
                )}
              </div>
              <div className="form-group">
                <label>Customer Email *</label>
                <input
                  type="email"
                  name="customerEmail"
                  value={formData.customerEmail}
                  onChange={handleInputChange}
                  className={fieldErrors.customerEmail ? 'input-error' : ''}
                  placeholder="john@example.com"
                />
                {fieldErrors.customerEmail && (
                  <span className="field-error-message">{fieldErrors.customerEmail}</span>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Adding...' : 'Add Shipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddShipmentModal;

