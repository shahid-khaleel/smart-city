import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Maximize, LocateFixed, Loader2, X } from 'lucide-react';

// Fix for standard Leaflet marker icons disappearing in React
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const alertIcon = L.icon({
  ...defaultIcon,
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
});

// SUB-COMPONENT: Re-renders the map tiles so they don't break when going fullscreen
const MapResizer = ({ isFullscreen }) => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 300);
  }, [isFullscreen, map]);
  return null;
};

// SUB-COMPONENT: Handles clicking the map to drop a pin (For Citizens)
const LocationPickerEvent = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    }
  });
  return null;
};

// SUB-COMPONENT: The GPS Locator Button
// Flies the map to the browser's current geolocation and, when acting as a
// location picker, also drops/moves the pin there (so clicking it actually
// sets the incident location, not just pans the camera).
const GPSButton = ({ isPicker, onLocationSelect }) => {
  const map = useMap();
  const [isLocating, setIsLocating] = useState(false);

  return (
    <button
      type="button"
      disabled={isLocating}
      className="absolute bottom-4 right-4 z-[1000] p-3 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-md transition-all disabled:opacity-60"
      title="Use my current location"
      onClick={(e) => {
        e.preventDefault();

        if (!("geolocation" in navigator)) {
          alert("GPS is not supported by your browser.");
          return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            map.flyTo([here.lat, here.lng], 16);

            // Actually place the marker at the real location when picking a spot
            if (isPicker && onLocationSelect) {
              onLocationSelect(here);
            }

            setIsLocating(false);
          },
          (err) => {
            console.error("GPS Error:", err);
            alert("Could not get your location. Please allow location access in your browser.");
            setIsLocating(false);
          },
          { enableHighAccuracy: true }
        );
      }}
    >
      {isLocating ? (
        <Loader2 size={20} className="animate-spin" />
      ) : (
        <LocateFixed size={20} />
      )}
    </button>
  );
};

const MapComponent = ({ 
  workerLocation = { lat: 40.7128, lng: -74.0060 }, 
  complaintLocation = { lat: 40.7200, lng: -74.0100 },
  isPicker = false, 
  onLocationSelect
}) => {
  const [routeCoords, setRouteCoords] = useState([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(isPicker ? false : true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (isPicker) return; 

    const fetchRoute = async () => {
      try {
        const apiKey = import.meta.env.VITE_ORS_API_KEY;
        if (!apiKey) return;

        const start = `${workerLocation.lng},${workerLocation.lat}`;
        const end = `${complaintLocation.lng},${complaintLocation.lat}`;
        
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${start}&end=${end}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch route");
        
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          const coordinates = data.features[0].geometry.coordinates;
          const flippedCoords = coordinates.map(coord => [coord[1], coord[0]]);
          setRouteCoords(flippedCoords);
        }
      } catch (error) {
        console.error("Error drawing route:", error);
      } finally {
        setIsLoadingRoute(false);
      }
    };

    fetchRoute();
  }, [workerLocation, complaintLocation, isPicker]);

  return (
    <div className={isFullscreen
      ? "fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm p-4 sm:p-10 flex flex-col"
      : "w-full h-full min-h-[300px] rounded-lg overflow-hidden border border-gray-200 relative z-0"
    }>

      <div className={`relative z-0 ${isFullscreen ? "w-full h-full rounded-xl overflow-hidden border border-gray-200 shadow-2xl" : "h-full w-full"}`}>

        {/* Floating Close (X) Button inside the map at Top Right */}
        {isFullscreen && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setIsFullscreen(false); }}
            className="absolute top-4 right-4 z-[1000] p-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-red-500 rounded-lg shadow-md transition-all"
            title="Close map"
          >
            <X size={20} />
          </button>
        )}

        <MapContainer
          center={isPicker ? [complaintLocation.lat, complaintLocation.lng] : [workerLocation.lat, workerLocation.lng]}
          zoom={13}
          zoomControl={false} // Disable default so we can explicitly place our own
          style={{ height: '100%', width: '100%', background: '#f3f4f6' }}
        >
          {/* Explicitly lock Zoom (+ / -) controls to Top Left */}
          <ZoomControl position="topleft" />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapResizer isFullscreen={isFullscreen} />
          
          {isPicker && <LocationPickerEvent onLocationSelect={onLocationSelect} />}

          <GPSButton isPicker={isPicker} onLocationSelect={onLocationSelect} />

          {!isPicker && (
            <Marker position={[workerLocation.lat, workerLocation.lng]} icon={defaultIcon}>
              <Popup>Your location</Popup>
            </Marker>
          )}

          <Marker position={[complaintLocation.lat, complaintLocation.lng]} icon={alertIcon}>
            <Popup>{isPicker ? "Incident location" : "Active incident"}</Popup>
          </Marker>

          {!isPicker && routeCoords.length > 0 && (
            <Polyline positions={routeCoords} color="#3b82f6" weight={5} opacity={0.8} />
          )}
        </MapContainer>

        {/* Expansion Toggle Button (Bottom Left) - Hides when fullscreen since we have the X button now */}
        {!isFullscreen && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setIsFullscreen(true); }}
            className="absolute bottom-4 left-4 z-[1000] p-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 rounded-lg shadow-md transition-all"
            title="Expand map"
          >
            <Maximize size={20} />
          </button>
        )}

        {isLoadingRoute && (
          <div className="absolute top-2 right-2 bg-white text-amber-600 px-3 py-1 text-xs font-medium rounded-md border border-gray-200 shadow-sm z-[1000]">
            Calculating route…
          </div>
        )}
      </div>
    </div>
  );
};

export default MapComponent;