import React, { useCallback, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];

const containerStyle = {
  width: '100%',
  height: '100%'
};

const libraries = ['places'];

const MapView = ({ userLocation, mechanics, selectedMechanicId, onMarkerClick, theme, isPicker, onMapClick, pendingLocation }) => {
    const [map, setMap] = useState(null);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries
    });

    const onLoad = useCallback(function callback(map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback(map) {
        setMap(null);
    }, []);

    const handleMapClick = (e) => {
        if (isPicker && onMapClick) {
            onMapClick({
                lat: e.latLng.lat(),
                lng: e.latLng.lng()
            });
        }
    };

    if (!isLoaded) return <div className="loading-container">Loading Map...</div>;

    const defaultCenter = {
        lat: 17.3850,
        lng: 78.4867
    };

    const center = pendingLocation || userLocation || defaultCenter;

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={isPicker ? 16 : 13}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onClick={handleMapClick}
            options={{
                disableDefaultUI: false,
                zoomControl: true,
                styles: theme === 'dark' ? darkMapStyle : []
            }}
        >
            {/* User Location Marker */}
            {userLocation && !isPicker && (
                <Marker
                    key="user-location"
                    position={userLocation}
                    icon={{
                        url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                    }}
                    title="You are here"
                />
            )}

            {/* Pending Location Marker (for registration) */}
            {isPicker && pendingLocation && (
                <Marker
                    key="pending-location"
                    position={pendingLocation}
                    icon={{
                        url: "http://maps.google.com/mapfiles/ms/icons/purple-dot.png"
                    }}
                    title="Selected Shop Location"
                    animation={window.google ? window.google.maps.Animation.DROP : null}
                />
            )}

            {/* Mechanics Markers */}
            {!isPicker && mechanics.map((mech, index) => {
                const id = mech._id || mech.id;
                const uniqueKey = `marker-${mech.source || 'db'}-${id || 'idx'}-${index}`;
                const isSelected = selectedMechanicId === id;
                const isGoogle = mech.source === 'google';
                
                // Color mapping:
                // Selected: Red (#ef4444)
                // DB: Orange (#f97316)
                // Google: Emerald (#10b981)
                
                let iconUrl = "http://maps.google.com/mapfiles/ms/icons/orange-dot.png";
                if (isSelected) {
                    iconUrl = "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
                } else if (isGoogle) {
                    iconUrl = "http://maps.google.com/mapfiles/ms/icons/green-dot.png";
                }

                return (
                    <Marker
                        key={uniqueKey}
                        position={{ lat: mech.lat, lng: mech.lng }}
                        onClick={() => onMarkerClick(mech)}
                        title={mech.shopName}
                        icon={{ url: iconUrl }}
                        zIndex={isSelected ? 1000 : 1}
                        animation={isSelected && window.google ? window.google.maps.Animation.BOUNCE : null}
                    />
                );
            })}
        </GoogleMap>
    );
};

export default React.memo(MapView);
