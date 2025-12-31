import React, { useState } from 'react';
import './FlagShipmentModal.css';

const FLAG_REASONS = [
  'Delayed Delivery',
  'Damaged Package',
  'Missing Items',
  'Wrong Address',
  'Customer Complaint',
  'Urgent Attention Required',
  'Other'
];

const FlagShipmentModal = ({ shipment, onClose, onFlag }) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!reason) {
      setError('Please select a reason for flagging');
      return;
    }

    if (reason === 'Other' && !customReason.trim()) {
      setError('Please specify the reason');
      return;
    }

    const flagData = {
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      reason: reason === 'Other' ? customReason : reason,
      notes: notes,
      flaggedAt: new Date().toISOString()
    };

    // In a real app, this would call a mutation to save the flag
    // For now, we'll store it in localStorage and show a success message
    const flags = JSON.parse(localStorage.getItem('flaggedShipments') || '[]');
    flags.push(flagData);
    localStorage.setItem('flaggedShipments', JSON.stringify(flags));

    setSuccess(true);
    setTimeout(() => {
      onFlag(flagData);
      onClose();
    }, 1500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content flag-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🚩 Flag Shipment</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="flag-form">
          {success && (
            <div className="success-message">
              <span className="success-icon">✅</span>
              <span className="success-text">Shipment {shipment.trackingNumber} has been flagged successfully!</span>
            </div>
          )}
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error}</span>
            </div>
          )}
          <div className="flag-info">
            <p><strong>Tracking Number:</strong> {shipment.trackingNumber}</p>
            <p><strong>Route:</strong> {shipment.origin} → {shipment.destination}</p>
          </div>

          <div className="form-group">
            <label htmlFor="reason">Reason for Flagging *</label>
            <select
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            >
              <option value="">Select a reason...</option>
              {FLAG_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {reason === 'Other' && (
            <div className="form-group">
              <label htmlFor="customReason">Please specify *</label>
              <input
                id="customReason"
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter reason"
                required={reason === 'Other'}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="notes">Additional Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional details..."
              rows="4"
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="flag-submit-button">
              🚩 Flag Shipment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FlagShipmentModal;

