import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useSubscription, gql } from '@apollo/client';
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
      currentLocation
      currentLat
      currentLng
      pinCode
      lastLocationUpdate
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_SHIPMENT_LOCATION_MUTATION = gql`
  mutation UpdateShipmentLocation($input: UpdateShipmentLocationInput!) {
    updateShipmentLocation(input: $input) {
      id
      currentLocation
      currentLat
      currentLng
      pinCode
      lastLocationUpdate
    }
  }
`;

const DELETE_SHIPMENT_MUTATION = gql`
  mutation DeleteShipment($id: ID!) {
    deleteShipment(id: $id)
  }
`;

const SHIPMENT_MESSAGES_QUERY = gql`
  query ShipmentMessages($shipmentId: ID!) {
    shipmentMessages(shipmentId: $shipmentId) {
      id
      shipmentId
      senderId
      senderName
      message
      createdAt
    }
  }
`;

const SHIPMENT_LOCATION_HISTORY_QUERY = gql`
  query ShipmentLocationHistory($shipmentId: ID!) {
    shipmentLocationHistory(shipmentId: $shipmentId) {
      id
      shipmentId
      location
      latitude
      longitude
      createdAt
    }
  }
`;

const SEND_MESSAGE_MUTATION = gql`
  mutation SendShipmentMessage($shipmentId: ID!, $message: String!) {
    sendShipmentMessage(shipmentId: $shipmentId, message: $message) {
      id
      shipmentId
      senderId
      senderName
      message
      createdAt
    }
  }
`;

const SHIPMENT_MESSAGE_ADDED_SUB = gql`
  subscription ShipmentMessageAdded($shipmentId: ID!) {
    shipmentMessageAdded(shipmentId: $shipmentId) {
      id
      shipmentId
      senderId
      senderName
      message
      createdAt
    }
  }
`;

const SHIPMENT_LOCATION_UPDATED_SUB = gql`
  subscription ShipmentLocationUpdated {
    shipmentLocationUpdated {
      id
      currentLocation
      currentLat
      currentLng
      pinCode
      lastLocationUpdate
    }
  }
`;

const ShipmentDetailModal = ({ shipment, onClose, onUpdate, initialEditMode = false, initialDeleteMode = false }) => {
  const { user } = useAuth();
  const canEdit = hasScope(user, SCOPES.EDIT_SHIPMENTS);
  const canDelete = hasScope(user, SCOPES.DELETE_SHIPMENTS);
  const canUpdateLocation = hasScope(user, SCOPES.EDIT_SHIPMENTS);
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

  const [locationForm, setLocationForm] = useState({
    currentLocation: shipment.currentLocation || '',
    currentLat: shipment.currentLat ?? '',
    currentLng: shipment.currentLng ?? '',
    pinCode: shipment.pinCode || '',
    lastLocationUpdate: shipment.lastLocationUpdate || '',
  });

  const [newMessage, setNewMessage] = useState('');

  // Quick Actions State
  const [qaAction, setQaAction] = useState(null); // 'PENDING' | 'DELAYED'
  const [qaReason, setQaReason] = useState('');
  const [qaEta, setQaEta] = useState('');

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

  const [updateShipmentLocation, { loading: updatingLocation }] = useMutation(UPDATE_SHIPMENT_LOCATION_MUTATION, {
    onCompleted: (data) => {
      const updated = data?.updateShipmentLocation;
      if (updated) {
        setLocationForm((prev) => ({
          ...prev,
          currentLocation: updated.currentLocation || '',
          currentLat: updated.currentLat ?? '',
          currentLng: updated.currentLng ?? '',
          pinCode: updated.pinCode || '',
          lastLocationUpdate: updated.lastLocationUpdate || '',
        }));
      }
      onUpdate();
      refetchLocationHistory();
    },
    onError: (error) => {
      if (error.networkError) {
        setUpdateError('Network issue');
      } else {
        setUpdateError(error.message || 'Failed to update location');
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

  const { data: messagesData, refetch: refetchMessages } = useQuery(SHIPMENT_MESSAGES_QUERY, {
    variables: { shipmentId: shipment.id },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const { data: locationHistoryData, refetch: refetchLocationHistory } = useQuery(SHIPMENT_LOCATION_HISTORY_QUERY, {
    variables: { shipmentId: shipment.id },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const [sendMessage, { loading: sendingMessage }] = useMutation(SEND_MESSAGE_MUTATION, {
    onCompleted: () => {
      setNewMessage('');
      refetchMessages();
    },
    onError: (error) => {
      if (error.networkError) {
        setUpdateError('Network issue');
      } else {
        setUpdateError(error.message || 'Failed to send message');
      }
    },
  });

  useSubscription(SHIPMENT_MESSAGE_ADDED_SUB, {
    variables: { shipmentId: shipment.id },
    onData: () => {
      refetchMessages();
    },
  });

  useSubscription(SHIPMENT_LOCATION_UPDATED_SUB, {
    onData: ({ data: subscriptionData }) => {
      const updated = subscriptionData?.data?.shipmentLocationUpdated;
      if (updated && String(updated.id) === String(shipment.id)) {
        setLocationForm((prev) => ({
          ...prev,
          currentLocation: updated.currentLocation || '',
          currentLat: updated.currentLat ?? '',
          currentLng: updated.currentLng ?? '',
          pinCode: updated.pinCode || '',
          lastLocationUpdate: updated.lastLocationUpdate || '',
        }));
        onUpdate();
        refetchLocationHistory();
      }
    },
  });

  const messages = useMemo(() => messagesData?.shipmentMessages || [], [messagesData]);
  const locationHistory = useMemo(() => locationHistoryData?.shipmentLocationHistory || [], [locationHistoryData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setLocationForm((prev) => ({ ...prev, [name]: value }));
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

  const handleSaveLocation = () => {
    const input = {
      id: shipment.id,
      currentLocation: locationForm.currentLocation,
    };

    const latNum = locationForm.currentLat === '' ? undefined : Number(locationForm.currentLat);
    const lngNum = locationForm.currentLng === '' ? undefined : Number(locationForm.currentLng);
    if (!Number.isNaN(latNum)) input.currentLat = latNum;
    if (!Number.isNaN(lngNum)) input.currentLng = lngNum;
    if (locationForm.pinCode) input.pinCode = locationForm.pinCode;

    updateShipmentLocation({ variables: { input } });
  };

  const handleSendMessage = () => {
    const trimmed = String(newMessage || '').trim();
    if (!trimmed) return;
    sendMessage({ variables: { shipmentId: shipment.id, message: trimmed } });
  };

  const handleQuickAction = (actionType) => {
    if (actionType === 'DELIVERED') {
      const input = {
        id: shipment.id,
        status: 'DELIVERED',
      };
      // If we have a destination pinCode/location, we ideally want to set the current location there.
      // But for simply marking it delivered fast:
      updateShipment({ variables: { input } });

      // Auto-update location to destination
      if (shipment.destination) {
        updateShipmentLocation({
          variables: {
            input: { id: shipment.id, currentLocation: shipment.destination }
          }
        });
      }
      return;
    }

    // For PENDING / DELAYED, open the reason prompt
    setQaAction(actionType);
    setQaReason(shipment.statusReason || '');
    setQaEta('');
  };

  const submitQuickActionPrompt = () => {
    if (!qaAction) return;

    const input = {
      id: shipment.id,
      status: qaAction,
      statusReason: qaReason,
    };
    if (qaEta) {
      input.estimatedDelivery = `${qaEta}T00:00:00.000Z`;
    }

    updateShipment({ variables: { input } });
    setQaAction(null);
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

        <div className="modal-body-container">
          <div className="modal-main-content">
            {updateError && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                <span className="error-text">{updateError}</span>
              </div>
            )}

            {!isEditing && (
              <div>
                <div className="detail-section" style={{ marginBottom: 16 }}>
                  <h3>Current Live Location</h3>
                  <div className="detail-grid">
                    <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                      <span className="detail-label">Current Location</span>
                      <span className="detail-value">{locationForm.currentLocation || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Latitude</span>
                      <span className="detail-value">
                        {locationForm.currentLat !== null && locationForm.currentLat !== undefined && locationForm.currentLat !== ''
                          ? locationForm.currentLat
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Longitude</span>
                      <span className="detail-value">
                        {locationForm.currentLng !== null && locationForm.currentLng !== undefined && locationForm.currentLng !== ''
                          ? locationForm.currentLng
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                      <span className="detail-label">Last Update</span>
                      <span className="detail-value">{formatDate(locationForm.lastLocationUpdate)}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section" style={{ marginBottom: 16 }}>
                  <h3>Location History (Travel Route)</h3>
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden', background: '#f8fafc' }}>
                    <div style={{ maxHeight: 300, overflow: 'auto', padding: 12 }}>
                      {locationHistory.length === 0 ? (
                        <div style={{ color: 'var(--text-secondary)', fontSize: 14, padding: '20px', textAlign: 'center' }}>
                          No location history yet. Location updates will appear here.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {/* Show origin as first location */}
                          <div style={{
                            padding: 12,
                            background: 'white',
                            borderRadius: 8,
                            border: '2px solid #10b981',
                            position: 'relative'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginBottom: 4 }}>📍 ORIGIN</div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>{shipment.origin}</div>
                                <div style={{ fontSize: 12, color: '#64748b' }}>Shipment created</div>
                              </div>
                            </div>
                          </div>

                          {/* Show location history */}
                          {locationHistory.map((loc, index) => (
                            <div key={loc.id} style={{
                              padding: 12,
                              background: 'white',
                              borderRadius: 8,
                              border: '1px solid #e2e8f0',
                              position: 'relative',
                              paddingLeft: 32
                            }}>
                              <div style={{
                                position: 'absolute',
                                left: 12,
                                top: 12,
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: '#3b82f6',
                                border: '2px solid white',
                                boxShadow: '0 0 0 2px #3b82f6'
                              }}></div>
                              {index < locationHistory.length - 1 && (
                                <div style={{
                                  position: 'absolute',
                                  left: 15,
                                  top: 20,
                                  width: 2,
                                  height: 'calc(100% + 12px)',
                                  background: '#cbd5e1'
                                }}></div>
                              )}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                                    {loc.location || 'Location update'}
                                  </div>
                                  {(loc.latitude !== null && loc.longitude !== null) && (
                                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                                      📍 {loc.latitude}, {loc.longitude}
                                    </div>
                                  )}
                                  <div style={{ fontSize: 12, color: '#64748b' }}>
                                    {formatDate(loc.createdAt)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Show current location if different from last history entry */}
                          {locationForm.currentLocation &&
                            (locationHistory.length === 0 ||
                              locationHistory[locationHistory.length - 1]?.location !== locationForm.currentLocation) && (
                              <div style={{
                                padding: 12,
                                background: 'white',
                                borderRadius: 8,
                                border: '2px solid #f59e0b',
                                position: 'relative',
                                paddingLeft: 32
                              }}>
                                <div style={{
                                  position: 'absolute',
                                  left: 12,
                                  top: 12,
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  background: '#f59e0b',
                                  border: '2px solid white',
                                  boxShadow: '0 0 0 2px #f59e0b',
                                  animation: 'pulse 2s infinite'
                                }}></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, marginBottom: 4 }}>🟢 CURRENT LIVE</div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                                      {locationForm.currentLocation}
                                    </div>
                                    {(locationForm.currentLat && locationForm.currentLng) && (
                                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                                        📍 {locationForm.currentLat}, {locationForm.currentLng}
                                      </div>
                                    )}
                                    <div style={{ fontSize: 12, color: '#64748b' }}>
                                      {formatDate(locationForm.lastLocationUpdate)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                          {/* Show destination as last location */}
                          <div style={{
                            padding: 12,
                            background: 'white',
                            borderRadius: 8,
                            border: '2px solid #8b5cf6',
                            position: 'relative'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 600, marginBottom: 4 }}>🎯 DESTINATION</div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>{shipment.destination}</div>
                                <div style={{ fontSize: 12, color: '#64748b' }}>
                                  {shipment.status === 'DELIVERED' ? 'Delivered' : 'Expected destination'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {canUpdateLocation && (
                  <div style={{ marginTop: 12 }}>
                    <div className="form-row">
                      <div className="form-group full-width">
                        <label>Update Location</label>
                        <input
                          type="text"
                          name="currentLocation"
                          value={locationForm.currentLocation}
                          onChange={handleLocationChange}
                          placeholder="e.g., Chennai, IN"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Latitude</label>
                        <input
                          type="number"
                          name="currentLat"
                          value={locationForm.currentLat}
                          onChange={handleLocationChange}
                          step="0.0000001"
                          placeholder="12.9716"
                        />
                      </div>
                      <div className="form-group">
                        <label>Longitude</label>
                        <input
                          type="number"
                          name="currentLng"
                          value={locationForm.currentLng}
                          onChange={handleLocationChange}
                          step="0.0000001"
                          placeholder="77.5946"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Pin Code</label>
                        <input
                          type="text"
                          name="pinCode"
                          value={locationForm.pinCode}
                          onChange={handleLocationChange}
                          placeholder="e.g., 500001"
                          maxLength={20}
                        />
                      </div>
                    </div>
                    <button
                      className="save-button"
                      onClick={handleSaveLocation}
                      disabled={updatingLocation}
                      style={{ width: '100%' }}
                    >
                      {updatingLocation ? 'Updating…' : 'Update Live Location'}
                    </button>
                  </div>
                )}
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

                <div className="detail-section">
                  <h3>Realtime Messages</h3>
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ maxHeight: 220, overflow: 'auto', padding: 12, background: '#f8fafc' }}>
                      {messages.length === 0 ? (
                        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                          No messages yet.
                        </div>
                      ) : (
                        messages.map((m) => (
                          <div key={m.id} style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 12, color: '#64748b' }}>
                              <b style={{ color: '#334155' }}>{m.senderName}</b> • {new Date(m.createdAt).toLocaleString()}
                            </div>
                            <div style={{ marginTop: 2, color: '#0f172a' }}>{m.message}</div>
                          </div>
                        ))
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, padding: 12, background: 'white' }}>
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message…"
                        style={{ flex: 1 }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <button className="save-button" onClick={handleSendMessage} disabled={sendingMessage}>
                        {sendingMessage ? 'Sending…' : 'Send'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* QUICK ACTIONS SIDEBAR */}
          {!isEditing && canEdit && (
            <div className="quick-actions-sidebar">
              <h3>⚡ Quick Actions</h3>

              <button
                className="qa-btn qa-btn-delivered"
                onClick={() => handleQuickAction('DELIVERED')}
                disabled={updating || shipment.status === 'DELIVERED'}
              >
                ✅ Mark Delivered
              </button>
              <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center', marginTop: -12, marginBottom: 8 }}>
                Sets to Destination
              </div>

              <div>
                <button
                  className="qa-btn qa-btn-pending"
                  onClick={() => handleQuickAction('PENDING')}
                  disabled={updating}
                  style={{ marginBottom: qaAction === 'PENDING' ? 8 : 0 }}
                >
                  ⏸ Mark Pending
                </button>
                {qaAction === 'PENDING' && (
                  <div className="qa-prompt">
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#475569' }}>Pending Reason:</div>
                    <textarea
                      value={qaReason}
                      onChange={e => setQaReason(e.target.value)}
                      placeholder="e.g., Customer not available..."
                    />
                    <div className="qa-prompt-actions">
                      <button className="qa-prompt-btn qa-prompt-cancel" onClick={() => setQaAction(null)}>Cancel</button>
                      <button className="qa-prompt-btn qa-prompt-submit" onClick={submitQuickActionPrompt}>Save</button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <button
                  className="qa-btn qa-btn-delayed"
                  onClick={() => handleQuickAction('DELAYED')}
                  disabled={updating}
                  style={{ marginBottom: qaAction === 'DELAYED' ? 8 : 0 }}
                >
                  ⏱ Mark Delayed
                </button>
                {qaAction === 'DELAYED' && (
                  <div className="qa-prompt">
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#475569' }}>Delay Reason:</div>
                    <textarea
                      value={qaReason}
                      onChange={e => setQaReason(e.target.value)}
                      placeholder="e.g., Vehicle breakdown, weather..."
                    />
                    <div style={{ fontSize: 12, fontWeight: 600, margin: '8px 0 6px', color: '#475569' }}>New ETA:</div>
                    <input
                      type="date"
                      value={qaEta}
                      onChange={e => setQaEta(e.target.value)}
                    />
                    <div className="qa-prompt-actions">
                      <button className="qa-prompt-btn qa-prompt-cancel" onClick={() => setQaAction(null)}>Cancel</button>
                      <button className="qa-prompt-btn qa-prompt-submit" onClick={submitQuickActionPrompt}>Save</button>
                    </div>
                  </div>
                )}
              </div>

              {shipment.statusReason && (
                <div style={{ marginTop: 'auto', background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                    Current Reason
                  </div>
                  <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.4 }}>
                    {shipment.statusReason}
                  </div>
                </div>
              )}
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

