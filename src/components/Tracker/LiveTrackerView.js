import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useSubscription, useMutation, useLazyQuery, gql } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';
import { hasScope, SCOPES } from '../../utils/permissions';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, ScaleControl, Polyline, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './LiveTrackerView.css';

// Fix default marker icons (CRA/webpack doesn't bundle Leaflet images automatically)
// eslint-disable-next-line no-underscore-dangle
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom vehicle-style icon for live shipments
const shipmentIcon = L.divIcon({
  className: 'shipment-marker',
  html: '<div class="shipment-marker-inner">🚚</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const selectedShipmentIcon = L.divIcon({
  className: 'shipment-marker shipment-marker-selected',
  html: '<div class="shipment-marker-inner">🚚</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const LIVE_SHIPMENTS_QUERY = gql`
  query LiveShipments {
    shipments(page: 1, limit: 1000) {
      shipments {
        id
        trackingNumber
        origin
        destination
        status
        currentLocation
        currentLat
        currentLng
        pinCode
        lastLocationUpdate
      }
    }
  }
`;

const SHIPMENT_LOCATION_UPDATED_SUB = gql`
  subscription ShipmentLocationUpdated {
    shipmentLocationUpdated {
      id
      trackingNumber
      status
      currentLocation
      currentLat
      currentLng
      pinCode
      lastLocationUpdate
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
      status
      lastLocationUpdate
    }
  }
`;

const REVERSE_GEOCODE_QUERY = gql`
  query ReverseGeocode($lat: Float!, $lng: Float!) {
    reverseGeocode(lat: $lat, lng: $lng) {
      success
      formattedAddress
      pinCode
      error
    }
  }
`;

const FORWARD_GEOCODE_QUERY = gql`
  query ForwardGeocode($address: String!) {
    forwardGeocode(address: $address) {
      success
      lat
      lng
      formattedAddress
      pinCode
      error
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

const EMPTY_SHIPMENTS = [];

const AutoFitBounds = ({ points, focusPoint }) => {
  const map = useMap();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!map) return;
    
    // If a specific point is focused, zoom to that point
    if (focusPoint && Array.isArray(focusPoint) && focusPoint.length === 2 && 
        Number.isFinite(focusPoint[0]) && Number.isFinite(focusPoint[1])) {
      map.setView(L.latLng(focusPoint[0], focusPoint[1]), 10);
      return;
    }
    
    // Otherwise, fit all points
    if (!points || points.length === 0) return;
    const validPoints = points.filter((p) => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (validPoints.length === 0) return;

    const bounds = L.latLngBounds(validPoints.map((p) => L.latLng(p[0], p[1])));
    // Fit all points nicely. Cap zoom so it doesn't zoom in too aggressively.
    map.fitBounds(bounds.pad(0.25), { maxZoom: 12 });
  }, [map, JSON.stringify(points), JSON.stringify(focusPoint)]);

  return null;
};

const LiveTrackerView = () => {
  const { user } = useAuth();
  const canView = hasScope(user, SCOPES.VIEW_SHIPMENTS);
  // `canEdit` flag currently unused but may be needed later
  // eslint-disable-next-line no-unused-vars
  const canEdit = hasScope(user, SCOPES.EDIT_SHIPMENTS);
  const isAdmin = user?.role === 'ADMIN';

  // store the point where the user last clicked on the map; we'll include
  // reverse-geocoded address/pincode once available
  const [clickedLocation, setClickedLocation] = useState(null);

  // helper component that hooks into leaflet events and reports clicks
  const MapClickHandler = ({ onClick }) => {
    useMapEvents({
      click: (e) => {
        if (onClick) onClick(e.latlng);
      },
    });
    return null;
  };

  // when the map is clicked, record coordinates only (no address lookup)
  const handleMapClick = (latlng) => {
    const { lat, lng } = latlng;
    setClickedLocation({ lat, lng });
  };


  const { data, loading, error, refetch } = useQuery(LIVE_SHIPMENTS_QUERY, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
    // Fallback: even if WebSocket subscription is blocked, keep data fresh
    pollInterval: 5000,
    notifyOnNetworkStatusChange: true,
  });

  useSubscription(SHIPMENT_LOCATION_UPDATED_SUB, {
    onData: () => {
      refetch();
    },
  });

  const trackedShipments = useMemo(() => {
    const shipments = data?.shipments?.shipments ?? EMPTY_SHIPMENTS;
    return shipments
      .filter((s) => s.status === 'IN_TRANSIT')
      .map((s) => {
        // Ensure coordinates are valid numbers and in correct range.
        // IMPORTANT: empty string becomes 0 with Number(''), so treat '' as null.
        const rawLat = s.currentLat;
        const rawLng = s.currentLng;
        const lat =
          rawLat === null || rawLat === undefined || rawLat === '' ? null : Number(rawLat);
        const lng =
          rawLng === null || rawLng === undefined || rawLng === '' ? null : Number(rawLng);
        
        // Validate coordinates are in valid range (lat: -90 to 90, lng: -180 to 180)
        const validLat = lat !== null && !isNaN(lat) && lat >= -90 && lat <= 90 ? lat : null;
        const validLng = lng !== null && !isNaN(lng) && lng >= -180 && lng <= 180 ? lng : null;
        
        return {
          ...s,
          hasCoords: validLat !== null && validLng !== null,
          lat: validLat,
          lng: validLng,
        };
      });
  }, [data]);

  const [selectedId, setSelectedId] = useState(null);
  const [showAdminSidebar, setShowAdminSidebar] = useState(false);
  const [locationForm, setLocationForm] = useState({
    currentLocation: '',
    currentLat: '',
    currentLng: '',
    pinCode: '',
    destinationPinCode: '',
    status: '',
  });
  const [updateError, setUpdateError] = useState('');

  // Route coordinates for selected shipment (origin -> destination)
  const [routeCoords, setRouteCoords] = useState(null);
  // Location history for selected shipment
  const [locationHistory, setLocationHistory] = useState([]);
  // Selected history location ID (for showing details)
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  // User's current GPS location
  const [userLocation, setUserLocation] = useState(null);
  const [userLocationError, setUserLocationError] = useState(null);

  const selected = trackedShipments.find((s) => s.id === selectedId) || null;
  const visibleShipments = selected ? [selected] : trackedShipments;
  const selectedHistoryLocation = locationHistory.find((h) => h.id === selectedHistoryId) || null;

  // whenever we pick a shipment from the list or by clicking a marker,
  // we no longer care about the previously clicked map point
  useEffect(() => {
    if (selected) {
      setClickedLocation(null);
    }
  }, [selected]);

  const [
    fetchLocationHistory,
    {
      loading: _historyLoading,
      data: historyData,
      error: historyError,
    },
  ] = useLazyQuery(SHIPMENT_LOCATION_HISTORY_QUERY);

  const [forwardGeocode] = useLazyQuery(FORWARD_GEOCODE_QUERY);

  // Derive location history state from lazy query result
  useEffect(() => {
    if (!historyData) return;
    if (historyData.shipmentLocationHistory) {
      const validHistory = historyData.shipmentLocationHistory
        .filter((h) => h.latitude != null && h.longitude != null)
        .map((h) => ({
          ...h,
          lat: parseFloat(h.latitude),
          lng: parseFloat(h.longitude),
        }))
        .filter(
          (h) =>
            !isNaN(h.lat) &&
            !isNaN(h.lng) &&
            h.lat >= -90 &&
            h.lat <= 90 &&
            h.lng >= -180 &&
            h.lng <= 180
        );
      setLocationHistory(validHistory);
    } else {
      setLocationHistory([]);
    }
  }, [historyData]);

  useEffect(() => {
    if (historyError) {
      setLocationHistory([]);
    }
  }, [historyError]);

  // Get user's GPS location on component mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLocationError('Geolocation is not supported by your browser');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0, // Always get fresh location
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Validate coordinates are within India bounds
        if (latitude >= 5 && latitude <= 40 && longitude >= 65 && longitude <= 100) {
          setUserLocation({ lat: latitude, lng: longitude });
          setUserLocationError(null);
        } else {
          setUserLocationError('Location is outside India bounds');
        }
      },
      (error) => {
        setUserLocationError(`Unable to get your location: ${error.message}`);
        console.error('Geolocation error:', error);
      },
      options
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const mapCenter = useMemo(() => {
    // If a shipment is selected, use its location
    if (selected && selected.hasCoords) {
      return [selected.lat, selected.lng];
    }
    // If no shipment selected, show user's GPS location
    if (userLocation) {
      return [userLocation.lat, userLocation.lng];
    }
    // Fallback: show first shipment with coordinates
    const firstWithCoords = trackedShipments.find((s) => s.hasCoords);
    if (firstWithCoords) {
      return [firstWithCoords.lat, firstWithCoords.lng];
    }
    // Default fallback: center on India (only India map visible)
    return [20.5937, 78.9629];
  }, [selected, trackedShipments, userLocation]);

  // When a shipment is selected, fetch origin & destination coordinates and location history
  useEffect(() => {
    if (!selected) {
      setRouteCoords(null);
      setLocationHistory([]);
      setSelectedHistoryId(null);
      return;
    }

    let cancelled = false;

    const fetchRoute = async () => {
      try {
        // Fetch location history for the selected shipment
        fetchLocationHistory({ variables: { shipmentId: selected.id } });

        // Geocode origin and destination using backend geocoding
        const [originRes, destRes] = await Promise.all([
          forwardGeocode({ variables: { address: selected.origin } }),
          forwardGeocode({ variables: { address: selected.destination } }),
        ]);

        const originData = originRes.data?.forwardGeocode;
        const destData = destRes.data?.forwardGeocode;

        if (
          !cancelled &&
          originData?.success &&
          destData?.success &&
          originData.lat != null &&
          originData.lng != null &&
          destData.lat != null &&
          destData.lng != null
        ) {
          setRouteCoords({
            origin: [originData.lat, originData.lng],
            destination: [destData.lat, destData.lng],
          });
        } else if (!cancelled) {
          setRouteCoords(null);
        }
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error('Error fetching route geocodes:', e);
        }
        if (!cancelled) {
          setRouteCoords(null);
        }
      }
    };

    fetchRoute();

    return () => {
      cancelled = true;
    };
  }, [selected, forwardGeocode, fetchLocationHistory]);

  const [updateShipmentLocation, { loading: updatingLocation }] = useMutation(UPDATE_SHIPMENT_LOCATION_MUTATION, {
    onCompleted: () => {
      setUpdateError('');
      setLocationForm({ currentLocation: '', currentLat: '', currentLng: '', pinCode: '', destinationPinCode: '', status: '' });
      setShowAdminSidebar(false);
      refetch();
    },
    onError: (err) => {
      setUpdateError(err.message || 'Failed to update location');
    },
  });

  const [
    reverseGeocode,
    { loading: geocodingLoading, data: reverseData },
  ] = useLazyQuery(REVERSE_GEOCODE_QUERY);

  const [
    geocodePinCode,
    { loading: pinCodeGeocodingLoading, data: geocodeData },
  ] = useLazyQuery(GEOCODE_PINCODE_QUERY);

  // Derive location form state from reverse geocode result
  useEffect(() => {
    if (reverseData?.reverseGeocode?.success) {
      setLocationForm((prev) => ({
        ...prev,
        currentLocation:
          reverseData.reverseGeocode.formattedAddress || prev.currentLocation,
        pinCode: reverseData.reverseGeocode.pinCode || prev.pinCode,
      }));
    }
  }, [reverseData]);

  // Derive location form state from pin code geocode result
  useEffect(() => {
    if (geocodeData?.geocodePinCode?.success) {
      setLocationForm((prev) => ({
        ...prev,
        currentLocation:
          geocodeData.geocodePinCode.formattedAddress || prev.currentLocation,
        currentLat:
          geocodeData.geocodePinCode.lat?.toString() || prev.currentLat,
        currentLng:
          geocodeData.geocodePinCode.lng?.toString() || prev.currentLng,
        pinCode: geocodeData.geocodePinCode.pinCode || prev.pinCode,
      }));
    }
  }, [geocodeData]);

  // Auto-geocode when coordinates are entered
  useEffect(() => {
    if (locationForm.currentLat && locationForm.currentLng && !locationForm.currentLocation) {
      const lat = parseFloat(locationForm.currentLat);
      const lng = parseFloat(locationForm.currentLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        reverseGeocode({ variables: { lat, lng } });
      }
    }
  }, [locationForm.currentLat, locationForm.currentLng, locationForm.currentLocation, reverseGeocode]);

  // Auto-geocode when pin code is entered (6 digits)
  useEffect(() => {
    const pinCode = locationForm.pinCode?.trim();
    if (pinCode && pinCode.length === 6 && /^\d+$/.test(pinCode) && !locationForm.currentLocation) {
      // Debounce: wait 500ms after user stops typing
      const timer = setTimeout(() => {
        geocodePinCode({ variables: { pinCode } });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [locationForm.pinCode, locationForm.currentLocation, geocodePinCode]);

  // Auto-detect delivery when current pin matches destination pin
  useEffect(() => {
    const currentPin = locationForm.pinCode?.trim();
    const destPin = locationForm.destinationPinCode?.trim();
    if (currentPin && destPin && currentPin === destPin && locationForm.status !== 'DELIVERED') {
      setLocationForm((prev) => ({ ...prev, status: 'DELIVERED' }));
    }
  }, [locationForm.pinCode, locationForm.destinationPinCode, locationForm.status]);

  useEffect(() => {
    if (selected && showAdminSidebar) {
      // Get destination pin code from geocoding destination address
      const fetchDestPin = async () => {
        try {
          const destRes = await forwardGeocode({ variables: { address: selected.destination } });
          const destData = destRes.data?.forwardGeocode;
          const destPin = destData?.pinCode || '';
          
          setLocationForm({
            currentLocation: selected.currentLocation || '',
            currentLat: selected.lat?.toString() || '',
            currentLng: selected.lng?.toString() || '',
            pinCode: selected.pinCode || '',
            destinationPinCode: destPin,
            status: selected.status || '',
          });
        } catch (e) {
          setLocationForm({
            currentLocation: selected.currentLocation || '',
            currentLat: selected.lat?.toString() || '',
            currentLng: selected.lng?.toString() || '',
            pinCode: selected.pinCode || '',
            destinationPinCode: '',
            status: selected.status || '',
          });
        }
      };
      fetchDestPin();
    }
  }, [selected, showAdminSidebar, forwardGeocode]);

  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setLocationForm((prev) => ({ ...prev, [name]: value }));
    setUpdateError('');
  };

  const handleUpdateLocation = (e) => {
    e.preventDefault();
    if (!selected) return;

    if (!locationForm.currentLocation && !locationForm.currentLat) {
      setUpdateError('Please provide either location address or coordinates');
      return;
    }

    updateShipmentLocation({
      variables: {
        input: {
          id: selected.id,
          currentLocation: locationForm.currentLocation || null,
          currentLat: locationForm.currentLat ? parseFloat(locationForm.currentLat) : null,
          currentLng: locationForm.currentLng ? parseFloat(locationForm.currentLng) : null,
          pinCode: locationForm.pinCode || null,
          status: locationForm.status || null,
        },
      },
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleString();
  };

  if (!canView) {
    return (
      <div className="live-tracker-view">
        <div className="tracker-card">
          <div className="tracker-muted">
            Access denied. Please ask your admin for <b>VIEW_SHIPMENTS</b>.
          </div>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="live-tracker-view">
        <div className="tracker-card">
          <div className="tracker-muted">Loading live tracker…</div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="live-tracker-view">
        <div className="tracker-card">
          <div className="tracker-muted">
            Error loading live tracker: {error.message}
            <div style={{ marginTop: 12 }}>
              <button onClick={() => refetch()}>Retry</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="live-tracker-view">
      <div className="live-tracker-header">
        <div>
          <h2>Live Tracker</h2>
          <p className="live-tracker-subtitle">
            Real-time location updates for in-transit shipments
          </p>
        </div>
        {isAdmin && (
          <button
            className="admin-sidebar-toggle"
            onClick={() => setShowAdminSidebar(!showAdminSidebar)}
          >
            {showAdminSidebar ? '✕ Close' : '⚙️ Admin Update Location'}
          </button>
        )}
      </div>

      <div className="tracker-panels">
        <div className="tracker-card">
          <div className="tracker-card-header">
            <h3>Map</h3>
            <span className="tracker-badge">
              {trackedShipments.length} in transit
            </span>
          </div>
          <div className="tracker-map">
            {/* GPS Location Status */}
            {!selected && (
              <div style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 500,
                background: userLocation ? 'rgba(16, 185, 129, 0.95)' : userLocationError ? 'rgba(239, 68, 68, 0.95)' : 'rgba(59, 130, 246, 0.95)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: 12,
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                {userLocation ? (
                  <>
                    <span>📍</span>
                    <span>My Location Active</span>
                  </>
                ) : userLocationError ? (
                  <>
                    <span>⚠️</span>
                    <span>GPS Unavailable</span>
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    <span>Getting Location...</span>
                  </>
                )}
              </div>
            )}
            <div className="map-legend">
              <div className="map-legend-title">Map Legend</div>
              {!selected && userLocation && (
                <div className="map-legend-row">
                  <span className="map-legend-dot" style={{ background: '#ef4444' }} />
                  <span>My Current Location (GPS)</span>
                </div>
              )}
              {selected && (
                <>
                  <div className="map-legend-row">
                    <span className="map-legend-dot" style={{ background: '#10b981' }} />
                    <span>Origin (Start Location)</span>
                  </div>
                  <div className="map-legend-row">
                    <span className="map-legend-dot" style={{ background: '#64748b', width: '10px', height: '10px' }} />
                    <span>Previous Locations (Travel History)</span>
                  </div>
                  <div className="map-legend-row">
                    <span className="map-legend-dot" style={{ background: '#f59e0b' }} />
                    <span>Current Live (Present Location)</span>
                  </div>
                  <div className="map-legend-row">
                    <span className="map-legend-dot" style={{ background: '#8b5cf6' }} />
                    <span>Destination (Next Location)</span>
                  </div>
                  <div className="map-legend-row">
                    <span className="map-legend-line" />
                    <span>Route line (Travel Path)</span>
                  </div>
                </>
              )}
            </div>
            <MapContainer 
              center={mapCenter} 
              zoom={selected?.hasCoords ? 8 : userLocation ? 12 : 4} 
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              // Restrict map to India bounds so only India is shown
              maxBounds={[[5, 65], [40, 100]]}
              maxBoundsViscosity={1.0}
            >
              <TileLayer
                // Standard OSM map with clear roads + buildings
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ZoomControl position="topright" />
              <ScaleControl position="bottomleft" imperial={false} />

              {/* Auto-zoom when a shipment is selected: fit Origin -> History -> Current -> Destination */}
              {/* If a history location is selected, zoom to that location; otherwise fit all points */}
              {/* If no shipment selected, zoom to user's location */}
              <AutoFitBounds
                focusPoint={
                  // if user has clicked somewhere, retain that view instead of jumping back to current location
                  clickedLocation
                    ? [clickedLocation.lat, clickedLocation.lng]
                    : selectedHistoryLocation
                    ? [selectedHistoryLocation.lat, selectedHistoryLocation.lng]
                    : selected
                    ? null
                    : userLocation
                    ? [userLocation.lat, userLocation.lng]
                    : null
                }
                points={[
                  routeCoords?.origin,
                  ...(locationHistory.map((h) => [h.lat, h.lng])),
                  selected?.hasCoords ? [selected.lat, selected.lng] : null,
                  routeCoords?.destination,
                  // If nothing is selected and nothing clicked, show user location only
                  ...(selected || clickedLocation
                    ? []
                    : [
                        ...(userLocation ? [[userLocation.lat, userLocation.lng]] : []),
                      ]),
                ]}
              />

              {/* capture clicks on the map */}
              <MapClickHandler onClick={handleMapClick} />

              {/* User's GPS Location Marker - Show only when no shipment is selected */}
              {!selected && userLocation && (
                <CircleMarker
                  center={[userLocation.lat, userLocation.lng]}
                  radius={10}
                  pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9, weight: 3 }}
                >
                  <Popup>
                    <div style={{ fontWeight: 700 }}>📍 My Current Location</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
                      📐 {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>
                      🎯 GPS Location
                    </div>
                  </Popup>
                </CircleMarker>
              )}

              {/* If the user clicked on the map, show a marker at that point */}
              {clickedLocation && (
                <Marker position={[clickedLocation.lat, clickedLocation.lng]}> 
                  <Popup>
                    <div style={{ fontWeight: 700 }}>📍 My GPS Location</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
                      📐 {clickedLocation.lat.toFixed(6)}, {clickedLocation.lng.toFixed(6)}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Shipment markers - Show only when a shipment is explicitly selected */}
              {selected &&
                visibleShipments
                  .filter((s) => s.hasCoords)
                  .map((s) => (
                    <Marker
                      key={s.id}
                      position={[s.lat, s.lng]}
                      icon={s.id === selectedId ? selectedShipmentIcon : shipmentIcon}
                      eventHandlers={{
                        click: () => setSelectedId(s.id),
                      }}
                    >
                      <Popup>
                        <div style={{ minWidth: 200 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                            {s.trackingNumber}
                          </div>
                          <div style={{ marginBottom: 4 }}>{s.currentLocation || 'Unknown location'}</div>
                          {s.pinCode && (
                            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                              📍 Pin: {s.pinCode}
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                            📐 {s.lat?.toFixed(6)}, {s.lng?.toFixed(6)}
                          </div>
                          {s.lastLocationUpdate && (
                            <div style={{ marginTop: 6, fontSize: 11, color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: 4 }}>
                              ⏰ {formatTime(s.lastLocationUpdate)}
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ))}

              {/* Travel path: Origin -> History points -> Current Live -> Destination */}
              {selected && routeCoords && (
                <>
                  {/* Main route line (Origin -> Destination) */}
                  <Polyline
                    positions={
                      selected?.hasCoords
                        ? [
                            routeCoords.origin,
                            ...(locationHistory.map((h) => [h.lat, h.lng])),
                            [selected.lat, selected.lng],
                            routeCoords.destination,
                          ]
                        : [
                            routeCoords.origin,
                            ...(locationHistory.map((h) => [h.lat, h.lng])),
                            routeCoords.destination,
                          ]
                    }
                    pathOptions={{
                      color: '#111827', // dark route line like delivery apps
                      weight: 6,
                      opacity: 0.95,
                    }}
                  />
                  {/* History path (connecting previous locations) */}
                  {locationHistory.length > 1 && (
                    <Polyline
                      positions={locationHistory.map((h) => [h.lat, h.lng])}
                      pathOptions={{
                        color: '#9ca3af',
                        weight: 3,
                        dashArray: '4 6',
                        opacity: 0.7,
                      }}
                    />
                  )}
                </>
              )}

              {/* Mark Origin for the selected shipment */}
              {routeCoords?.origin && (
                <CircleMarker center={routeCoords.origin} radius={7} pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.9 }}>
                  <Popup>
                    <div style={{ fontWeight: 700 }}>📍 Origin (Start Location)</div>
                    <div style={{ marginTop: 4 }}>{selected?.origin}</div>
                  </Popup>
                </CircleMarker>
              )}

              {/* Mark previous locations from history */}
              {locationHistory.map((h, idx) => {
                const isSelected = h.id === selectedHistoryId;
                return (
                  <CircleMarker
                    key={h.id}
                    center={[h.lat, h.lng]}
                    radius={isSelected ? 8 : 5}
                    pathOptions={{
                      color: isSelected ? '#3b82f6' : '#64748b',
                      fillColor: isSelected ? '#3b82f6' : '#64748b',
                      fillOpacity: isSelected ? 0.95 : 0.7,
                      weight: isSelected ? 3 : 1,
                    }}
                    eventHandlers={{
                      click: () => setSelectedHistoryId(h.id),
                    }}
                  >
                    <Popup>
                      <div style={{ fontWeight: 700 }}>📍 Previous Location #{idx + 1}</div>
                      <div style={{ marginTop: 4 }}>{h.location || 'Unknown location'}</div>
                      <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>
                        ⏰ {formatTime(h.createdAt)}
                      </div>
                      {h.createdAt && (
                        <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>
                          📅 {new Date(h.createdAt).toLocaleString()}
                        </div>
                      )}
                    </Popup>
                  </CircleMarker>
                );
              })}

              {/* Mark Current Live location */}
              {selected?.hasCoords && (
                <CircleMarker center={[selected.lat, selected.lng]} radius={8} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.95 }}>
                  <Popup>
                    <div style={{ fontWeight: 700 }}>🟢 Current Live (Present Location)</div>
                    <div style={{ marginTop: 4 }}>{selected?.currentLocation || 'Unknown location'}</div>
                    {selected?.pinCode ? <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>📍 {selected.pinCode}</div> : null}
                  </Popup>
                </CircleMarker>
              )}

              {/* Mark Destination (Next Location) */}
              {routeCoords?.destination && (
                <CircleMarker center={routeCoords.destination} radius={7} pathOptions={{ color: '#8b5cf6', fillColor: '#8b5cf6', fillOpacity: 0.9 }}>
                  <Popup>
                    <div style={{ fontWeight: 700 }}>🎯 Destination (Next Location)</div>
                    <div style={{ marginTop: 4 }}>{selected?.destination}</div>
                  </Popup>
                </CircleMarker>
              )}
            </MapContainer>
          </div>
        </div>

        <div className="tracker-card">
          <div className="tracker-card-header">
            <h3>In Transit</h3>
            <span className="tracker-badge">Click to focus</span>
          </div>
          
          {/* Previous Locations Dropdown - Show only when a shipment is selected */}
          {selected && locationHistory.length > 0 && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: '#f8fafc' }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                📍 Select Previous Location:
              </label>
              <select
                value={selectedHistoryId || ''}
                onChange={(e) => setSelectedHistoryId(e.target.value || null)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: 14,
                  background: 'white',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="">-- Select a previous location --</option>
                {locationHistory.map((h, idx) => (
                  <option key={h.id} value={h.id}>
                    #{idx + 1} - {h.location || 'Unknown location'} ({formatTime(h.createdAt)})
                  </option>
                ))}
              </select>
              
              {/* Show details when a location is selected */}
              {selectedHistoryLocation && (
                <div style={{
                  marginTop: 12,
                  padding: 12,
                  background: 'white',
                  border: '1px solid #3b82f6',
                  borderRadius: '6px',
                  borderLeft: '4px solid #3b82f6',
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#1e40af' }}>
                    📍 Location Details
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>Location:</strong> {selectedHistoryLocation.location || 'Unknown location'}
                  </div>
                  <div style={{ marginBottom: 6, fontSize: 13, color: '#64748b' }}>
                    <strong>Coordinates:</strong> {selectedHistoryLocation.lat.toFixed(6)}, {selectedHistoryLocation.lng.toFixed(6)}
                  </div>
                  <div style={{ marginBottom: 6, fontSize: 13, color: '#64748b' }}>
                    <strong>Received:</strong> {formatTime(selectedHistoryLocation.createdAt)}
                  </div>
                  {selectedHistoryLocation.createdAt && (
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      <strong>Full Date:</strong> {new Date(selectedHistoryLocation.createdAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="tracker-list">
            {trackedShipments.length === 0 ? (
              <div className="tracker-muted">No in-transit shipments right now.</div>
            ) : (
              trackedShipments.map((s) => (
                <div
                  key={s.id}
                  className={`tracker-list-item ${s.id === selectedId ? 'active' : ''}`}
                  onClick={() => setSelectedId(s.id)}
                >
                  <div className="tracker-list-top">
                    <div className="tracker-tracking">{s.trackingNumber}</div>
                    <div className="tracker-status">
                      {s.hasCoords ? '🟢 Live' : '⚪ No GPS'}
                    </div>
                  </div>
                  <div className="tracker-location">
                    {s.currentLocation || 'Unknown location'}
                    {s.pinCode && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: '#64748b' }}>
                        📍 {s.pinCode}
                      </span>
                    )}
                  </div>
                  {s.lastLocationUpdate && (
                    <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>
                      ⏰ Updated: {formatTime(s.lastLocationUpdate)}
                    </div>
                  )}
                  <div className="tracker-route" style={{
                    marginTop: 8,
                    padding: '8px 12px',
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                    borderRadius: 8,
                    border: '1px solid #bae6fd',
                    fontSize: 12
                  }}>
                    <span style={{ fontWeight: 600, color: '#0c4a6e' }}>📍 {s.origin}</span>
                    <span style={{ margin: '0 8px', color: '#0284c7', fontWeight: 700 }}>→</span>
                    <span style={{ fontWeight: 600, color: '#0c4a6e' }}>🎯 {s.destination}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Admin Sidebar for Location Updates */}
      {isAdmin && showAdminSidebar && (
        <div className="admin-location-sidebar">
          <div className="admin-sidebar-header">
            <h3>Update Location {selected ? `- ${selected.trackingNumber}` : ''}</h3>
            <button onClick={() => setShowAdminSidebar(false)}>✕</button>
          </div>
          {!selected ? (
            <div className="admin-sidebar-content">
              <p>Please select a shipment from the list to update its location.</p>
            </div>
          ) : (
            <form onSubmit={handleUpdateLocation} className="admin-sidebar-content">
              {updateError && (
                <div className="error-message" style={{ marginBottom: 12 }}>
                  <span className="error-icon">⚠️</span>
                  <span className="error-text">{updateError}</span>
                </div>
              )}
              <div className="form-group">
                <label>Location Address</label>
                <input
                  type="text"
                  name="currentLocation"
                  value={locationForm.currentLocation}
                  onChange={handleLocationChange}
                  placeholder="e.g., Hyderabad, Telangana"
                />
                <small>Or enter coordinates below</small>
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
                    placeholder="e.g., 15.8281"
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
                    placeholder="e.g., 78.0373"
                  />
                </div>
              </div>
              {locationForm.currentLat && locationForm.currentLng && geocodingLoading && (
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                  🔍 Getting address from coordinates...
                </div>
              )}
              {locationForm.pinCode && pinCodeGeocodingLoading && (
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                  🔍 Getting address from pin code...
                </div>
              )}
              <div className="form-group">
                <label>Current Pin Code</label>
                <input
                  type="text"
                  name="pinCode"
                  value={locationForm.pinCode}
                  onChange={handleLocationChange}
                  placeholder="e.g., 500001 (auto-fills address)"
                  maxLength={6}
                  pattern="[0-9]{6}"
                />
                <small style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                  Enter 6-digit pin code to auto-fill address and coordinates
                </small>
              </div>
              <div className="form-group">
                <label>Destination Pin Code</label>
                <input
                  type="text"
                  name="destinationPinCode"
                  value={locationForm.destinationPinCode}
                  onChange={handleLocationChange}
                  placeholder="e.g., 516321 (for delivery detection)"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  readOnly
                  style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                />
                <small style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                  Auto-filled from destination address. If current pin matches, status will auto-set to "Delivered"
                </small>
              </div>
              {locationForm.pinCode && locationForm.destinationPinCode && 
               locationForm.pinCode.trim() === locationForm.destinationPinCode.trim() && (
                <div style={{
                  padding: 12,
                  background: '#fef3c7',
                  border: '1px solid #fbbf24',
                  borderRadius: 6,
                  marginBottom: 12,
                  fontSize: 13,
                  color: '#92400e',
                }}>
                  ✅ <strong>Delivery Detected!</strong> Current pin code matches destination. Status set to "Delivered".
                </div>
              )}
              <div className="form-group">
                <label>Status</label>
                <select
                  name="status"
                  value={locationForm.status || ''}
                  onChange={handleLocationChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: 14,
                  }}
                >
                  <option value="">Keep Current Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_TRANSIT">In Transit</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <small style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                  {locationForm.status === 'DELIVERED' ? '✅ Status will be set to Delivered' : 'Select status or leave unchanged'}
                </small>
              </div>
              <button
                type="submit"
                className="save-button"
                disabled={updatingLocation}
                style={{ width: '100%', marginTop: 12 }}
              >
                {updatingLocation ? 'Updating...' : 'Update Location'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveTrackerView;
