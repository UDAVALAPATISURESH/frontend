import React, { useState, useEffect } from 'react';
import { useMutation, useLazyQuery, gql } from '@apollo/client';
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
      actualDelivery
      pinCode
      customerName
      customerEmail
      creatorEmail
    }
  }
`;

const GEOCODE_PINCODE_QUERY = gql`
  query GeocodePinCode($pinCode: String!) {
    geocodePinCode(pinCode: $pinCode) {
      success
      formattedAddress
      lat
      lng
      pinCode
      error
    }
  }
`;

const AddShipmentModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    trackingNumber: '',
    origin: '',
    destination: '',
    originPinCode: '',
    destinationPinCode: '',
    status: 'PENDING',
    carrier: '',
    weight: '',
    dimensions: '',
    estimatedDelivery: '',
    actualDelivery: '',
    pinCode: '',
    customerName: '',
    customerEmail: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [geocodePinCode] = useLazyQuery(GEOCODE_PINCODE_QUERY);

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

  // Auto-fill origin address when origin pin code is entered (6 digits)
  useEffect(() => {
    const originPin = formData.originPinCode?.trim();
    if (originPin && originPin.length === 6 && /^\d+$/.test(originPin) && !formData.origin) {
      const timer = setTimeout(async () => {
        try {
          const { data } = await geocodePinCode({ variables: { pinCode: originPin } });
          const result = data?.geocodePinCode;
          if (result) {
            if (result.success) {
              setFormData((prev) => ({ ...prev, origin: result.formattedAddress || prev.origin }));
              setFieldErrors((prev) => ({ ...prev, originPinCode: '' }));
            } else {
              setFieldErrors((prev) => ({ ...prev, originPinCode: result.error || 'Invalid pin code' }));
            }
          }
        } catch (err) {
          setFieldErrors((prev) => ({ ...prev, originPinCode: 'Failed to find pin code' }));
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.originPinCode, formData.origin, geocodePinCode]);

  // Auto-fill destination address when destination pin code is entered (6 digits)
  useEffect(() => {
    const destPin = formData.destinationPinCode?.trim();
    if (destPin && destPin.length === 6 && /^\d+$/.test(destPin) && !formData.destination) {
      const timer = setTimeout(async () => {
        try {
          const { data } = await geocodePinCode({ variables: { pinCode: destPin } });
          const result = data?.geocodePinCode;
          if (result) {
            if (result.success) {
              setFormData((prev) => ({ ...prev, destination: result.formattedAddress || prev.destination }));
              setFieldErrors((prev) => ({ ...prev, destinationPinCode: '' }));
            } else {
              setFieldErrors((prev) => ({ ...prev, destinationPinCode: result.error || 'Invalid pin code' }));
            }
          }
        } catch (err) {
          setFieldErrors((prev) => ({ ...prev, destinationPinCode: 'Failed to find pin code' }));
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.destinationPinCode, formData.destination, geocodePinCode]);

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

    // Build GraphQL input explicitly so we only send fields
    // that exist on ShipmentInput (extra fields cause 400 errors).
    const input = {
      trackingNumber: formData.trackingNumber.trim(),
      origin: formData.origin.trim(),
      destination: formData.destination.trim(),
      status: formData.status,
      carrier: formData.carrier.trim(),
      weight: parseFloat(formData.weight) || 0,
      dimensions: formData.dimensions.trim(),
      estimatedDelivery: formData.estimatedDelivery
        ? `${formData.estimatedDelivery}T00:00:00.000Z`
        : new Date().toISOString(),
      customerName: formData.customerName.trim(),
      customerEmail: formData.customerEmail.trim(),
    };

    // Optional fields
    if (formData.actualDelivery) {
      input.actualDelivery = `${formData.actualDelivery}T00:00:00.000Z`;
    }
    if (formData.pinCode) {
      input.pinCode = formData.pinCode.trim();
    }

    addShipment({
      variables: { input },
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
            <h3>Route Information (Where to Where)</h3>

            {/* Visual Route Preview */}
            {(formData.origin || formData.destination) && (
              <div className="route-preview" style={{
                marginBottom: 20,
                padding: 16,
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                borderRadius: 12,
                border: '2px solid #bae6fd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16
              }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#0ea5e9', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>
                    From
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0c4a6e' }}>
                    {formData.origin || '...'}
                  </div>
                </div>
                <div style={{ fontSize: 24, color: '#0284c7', fontWeight: 700 }}>→</div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#0ea5e9', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>
                    To
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0c4a6e' }}>
                    {formData.destination || '...'}
                  </div>
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Origin Pin Code</label>
                <input
                  type="text"
                  name="originPinCode"
                  value={formData.originPinCode}
                  onChange={handleInputChange}
                  placeholder="e.g., 500001 (auto-fills address)"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  className={fieldErrors.originPinCode ? 'input-error' : ''}
                />
                {fieldErrors.originPinCode && (
                  <span className="field-error-message">{fieldErrors.originPinCode}</span>
                )}
                <small style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                  Enter 6-digit pin code to auto-fill origin address (optional)
                </small>
              </div>
              <div className="form-group">
                <label>Destination Pin Code</label>
                <input
                  type="text"
                  name="destinationPinCode"
                  value={formData.destinationPinCode}
                  onChange={handleInputChange}
                  placeholder="e.g., 516321 (auto-fills address)"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  className={fieldErrors.destinationPinCode ? 'input-error' : ''}
                />
                {fieldErrors.destinationPinCode && (
                  <span className="field-error-message">{fieldErrors.destinationPinCode}</span>
                )}
                <small style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                  Enter 6-digit pin code to auto-fill destination address (optional)
                </small>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Origin *</label>
                <input
                  type="text"
                  name="origin"
                  value={formData.origin}
                  onChange={handleInputChange}
                  className={fieldErrors.origin ? 'input-error' : ''}
                  placeholder="New York, NY (or enter pin code above)"
                />
                {fieldErrors.origin && (
                  <span className="field-error-message">{fieldErrors.origin}</span>
                )}
                <small style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                  You can enter manually or use pin code above to auto-fill
                </small>
              </div>
              <div className="form-group">
                <label>Destination *</label>
                <input
                  type="text"
                  name="destination"
                  value={formData.destination}
                  onChange={handleInputChange}
                  className={fieldErrors.destination ? 'input-error' : ''}
                  placeholder="Los Angeles, CA (or enter pin code above)"
                />
                {fieldErrors.destination && (
                  <span className="field-error-message">{fieldErrors.destination}</span>
                )}
                <small style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                  You can enter manually or use pin code above to auto-fill
                </small>
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
            <div className="form-row">
              <div className="form-group">
                <label>Actual Delivery</label>
                <input
                  type="date"
                  name="actualDelivery"
                  value={formData.actualDelivery}
                  onChange={handleInputChange}
                  placeholder="Leave empty if not delivered yet"
                />
                <small style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                  Only fill this if shipment is already delivered
                </small>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Pin Code</label>
                <input
                  type="text"
                  name="pinCode"
                  value={formData.pinCode}
                  onChange={handleInputChange}
                  placeholder="e.g., 500001"
                  maxLength={20}
                />
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

