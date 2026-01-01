import React from 'react';
import './DeleteConfirmationModal.css';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, itemName, loading = false }) => {
  if (!isOpen) return null;

  return (
    <div className="delete-modal-overlay" onClick={onClose}>
      <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-header">
          <div className="delete-modal-icon">⚠️</div>
          <h3 className="delete-modal-title">{title || 'Confirm Delete'}</h3>
        </div>
        <div className="delete-modal-body">
          <p className="delete-modal-message">
            {message || `Are you sure you want to delete ${itemName ? `"${itemName}"` : 'this item'}?`}
          </p>
          <p className="delete-modal-warning">This action cannot be undone.</p>
        </div>
        <div className="delete-modal-footer">
          <button
            type="button"
            className="delete-modal-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="delete-modal-confirm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;


