'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const defaultIcon = L.icon({
  iconUrl: '/red-pointer.svg',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Location {
  lat: number;
  lng: number;
}

interface MapPickerProps {
  onLocationSelected: (location: Location) => void;
  defaultLocation?: Location | null;
}

// Component to handle map interactions
const LocationMarker = ({
  onLocationSelected,
  defaultLocation,
}: MapPickerProps) => {
  const [position, setPosition] = useState<Location | null>(
    defaultLocation || null
  );

  const map = useMapEvents({
    click(e) {
      const newPos = { lat: e.latlng.lat, lng: e.latlng.lng };
      setPosition(newPos);
      onLocationSelected(newPos);
    },
  });

  useEffect(() => {
    if (defaultLocation && map) {
      map.setView([defaultLocation.lat, defaultLocation.lng], map.getZoom());
    }
  }, [defaultLocation, map]);

  return position === null ? null : (
    <Marker position={position} icon={defaultIcon} />
  );
};

const MapPicker: React.FC<MapPickerProps> = ({
  onLocationSelected,
  defaultLocation,
}) => {
  // Default center to a common location if no default is provided
  const center = defaultLocation || { lat: 9.0765, lng: 7.3986 }; // Default to Abuja, Nigeria

  return (
    <div className="h-64 w-full rounded-md overflow-hidden border">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker
          onLocationSelected={onLocationSelected}
          defaultLocation={defaultLocation}
        />
      </MapContainer>
    </div>
  );
};

export default MapPicker;
