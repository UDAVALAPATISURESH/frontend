import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, ZoomControl, ScaleControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icons
// eslint-disable-next-line no-underscore-dangle
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const AutoFitBounds = ({ points }) => {
    const map = useMap();
    useEffect(() => {
        if (!map || !points || points.length === 0) return;
        const validPoints = points.filter((p) => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]));
        if (validPoints.length === 0) return;

        const bounds = L.latLngBounds(validPoints.map((p) => L.latLng(p[0], p[1])));
        map.fitBounds(bounds.pad(0.25), { maxZoom: 12 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, JSON.stringify(points)]);
    return null;
};

const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
};

const ShipmentRouteMap = ({
    mapCenter,
    zoom = 4,
    routeCoords,
    historyPoints = [],
    locationHistory = [],
    selectedShipment,
    liveMarkers = [],
    onMarkerClick = () => { },
    showControls = true,
    currentLat,
    currentLng,
    currentLocationName
}) => {

    const hasCurrentCoords = currentLat !== null && currentLat !== undefined && currentLat !== '' &&
        currentLng !== null && currentLng !== undefined && currentLng !== '';

    const currentCoords = hasCurrentCoords ? [Number(currentLat), Number(currentLng)] : null;

    return (
        <MapContainer
            center={mapCenter}
            zoom={zoom}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            maxBounds={[[5, 65], [40, 100]]}
            maxBoundsViscosity={1.0}
        >
            <TileLayer
                attribution="&copy; OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {showControls && (
                <>
                    <ZoomControl position="topright" />
                    <ScaleControl position="bottomleft" imperial={false} />
                </>
            )}

            <AutoFitBounds
                points={[
                    routeCoords?.origin,
                    ...historyPoints,
                    currentCoords,
                    routeCoords?.destination,
                    ...liveMarkers.filter(s => s.hasCoords).map(s => [s.lat, s.lng])
                ]}
            />

            {liveMarkers.filter(s => s.hasCoords).map((s) => (
                <Marker
                    key={`live-${s.id}`}
                    position={[s.lat, s.lng]}
                    eventHandlers={{
                        click: () => onMarkerClick(s.id),
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

            {routeCoords && (
                <Polyline
                    positions={
                        currentCoords
                            ? [routeCoords.origin, ...historyPoints, currentCoords, routeCoords.destination]
                            : [routeCoords.origin, ...historyPoints, routeCoords.destination]
                    }
                    pathOptions={{ color: '#0ea5e9', weight: 4, dashArray: '6 8' }}
                />
            )}

            {historyPoints.map((pt, i) => (
                <CircleMarker
                    key={`history-${i}`}
                    center={pt}
                    radius={5}
                    pathOptions={{ color: '#3b82f6', fillColor: 'white', fillOpacity: 1, weight: 2 }}
                >
                    <Popup>
                        <div style={{ fontWeight: 600 }}>🛑 Travel History Stop</div>
                        <div style={{ fontSize: 12, marginTop: 4 }}>
                            {locationHistory.filter(h => h.latitude === pt[0] && h.longitude === pt[1])[0]?.location || 'Stop Location'}
                        </div>
                    </Popup>
                </CircleMarker>
            ))}

            {routeCoords?.origin && (
                <CircleMarker center={routeCoords.origin} radius={7} pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.9 }}>
                    <Popup>
                        <div style={{ fontWeight: 700 }}>📍 Origin</div>
                        <div style={{ marginTop: 4 }}>{selectedShipment?.origin || 'Origin'}</div>
                    </Popup>
                </CircleMarker>
            )}

            {currentCoords && (
                <CircleMarker center={currentCoords} radius={8} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.95 }}>
                    <Popup>
                        <div style={{ fontWeight: 700 }}>🟢 Current Live</div>
                        <div style={{ marginTop: 4 }}>{currentLocationName || 'Unknown location'}</div>
                        {selectedShipment?.pinCode && <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>📍 {selectedShipment.pinCode}</div>}
                    </Popup>
                </CircleMarker>
            )}

            {routeCoords?.destination && (
                <CircleMarker center={routeCoords.destination} radius={7} pathOptions={{ color: '#8b5cf6', fillColor: '#8b5cf6', fillOpacity: 0.9 }}>
                    <Popup>
                        <div style={{ fontWeight: 700 }}>🎯 Destination</div>
                        <div style={{ marginTop: 4 }}>{selectedShipment?.destination || 'Destination'}</div>
                    </Popup>
                </CircleMarker>
            )}
        </MapContainer>
    );
};

export default ShipmentRouteMap;
