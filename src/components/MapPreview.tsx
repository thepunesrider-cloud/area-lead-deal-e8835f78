import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAPTILER_KEY = 'vUJcqBljtTjPDAM96UaW';

interface MapPreviewProps {
  latitude: number;
  longitude: number;
  radius?: number; // km
  onLocationChange: (lat: number, lng: number) => void;
  draggable?: boolean;
}

const MapPreview: React.FC<MapPreviewProps> = ({
  latitude,
  longitude,
  onLocationChange,
  draggable = true,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
      center: [longitude, latitude],
      zoom: 15,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Create draggable marker
    marker.current = new maplibregl.Marker({
      color: '#22C55E',
      draggable: draggable,
    })
      .setLngLat([longitude, latitude])
      .addTo(map.current);

    if (draggable) {
      marker.current.on('dragend', () => {
        const lngLat = marker.current?.getLngLat();
        if (lngLat) {
          onLocationChange(lngLat.lat, lngLat.lng);
        }
      });
    }

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // Allow clicking on map to move marker
    if (draggable) {
      map.current.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        marker.current?.setLngLat([lng, lat]);
        onLocationChange(lat, lng);
      });
    }

    return () => {
      marker.current?.remove();
      map.current?.remove();
    };
  }, []);

  // Update marker position when props change
  useEffect(() => {
    if (marker.current && mapLoaded) {
      marker.current.setLngLat([longitude, latitude]);
      map.current?.flyTo({
        center: [longitude, latitude],
        zoom: 15,
        duration: 500,
      });
    }
  }, [latitude, longitude, mapLoaded]);

  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden border border-border">
      <div ref={mapContainer} className="absolute inset-0" />
      {draggable && (
        <div className="absolute bottom-2 left-2 right-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-muted-foreground text-center">
          Drag the pin or click on map to adjust location
        </div>
      )}
    </div>
  );
};

export default MapPreview;
