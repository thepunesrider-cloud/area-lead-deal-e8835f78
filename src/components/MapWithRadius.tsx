import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapWithRadiusProps {
  latitude: number;
  longitude: number;
  radiusKm: number;
  className?: string;
}

const MapWithRadius: React.FC<MapWithRadiusProps> = ({ 
  latitude, 
  longitude, 
  radiusKm,
  className = ''
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const MAPTILER_KEY = 'vUJcqBljtTjPDAM96UaW';

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/streets/style.json?key=${MAPTILER_KEY}`,
      center: [longitude, latitude],
      zoom: getZoomForRadius(radiusKm),
      attributionControl: false,
    });

    // Add marker
    new maplibregl.Marker({ color: 'hsl(271, 91%, 65%)' })
      .setLngLat([longitude, latitude])
      .addTo(map.current);

    // Add radius circle
    map.current.on('load', () => {
      if (!map.current) return;

      // Generate circle polygon
      const circle = createCircle([longitude, latitude], radiusKm);

      map.current.addSource('radius-circle', {
        type: 'geojson',
        data: circle,
      });

      map.current.addLayer({
        id: 'radius-circle-fill',
        type: 'fill',
        source: 'radius-circle',
        paint: {
          'fill-color': 'hsl(271, 91%, 65%)',
          'fill-opacity': 0.15,
        },
      });

      map.current.addLayer({
        id: 'radius-circle-line',
        type: 'line',
        source: 'radius-circle',
        paint: {
          'line-color': 'hsl(271, 91%, 65%)',
          'line-width': 2,
          'line-opacity': 0.8,
        },
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [latitude, longitude, radiusKm]);

  // Update circle when radius changes
  useEffect(() => {
    if (!map.current) return;

    const source = map.current.getSource('radius-circle') as maplibregl.GeoJSONSource;
    if (source) {
      const circle = createCircle([longitude, latitude], radiusKm);
      source.setData(circle);
      
      map.current.easeTo({
        center: [longitude, latitude],
        zoom: getZoomForRadius(radiusKm),
        duration: 500,
      });
    }
  }, [radiusKm, latitude, longitude]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-full rounded-xl" />
      
      {/* Radius Label */}
      <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border shadow-sm">
        <span className="text-sm font-medium text-foreground">
          {radiusKm} km radius
        </span>
      </div>
    </div>
  );
};

// Helper function to create a GeoJSON circle
function createCircle(center: [number, number], radiusKm: number, points = 64): GeoJSON.Feature {
  const coords: [number, number][] = [];
  const distanceX = radiusKm / (111.32 * Math.cos((center[1] * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = center[0] + distanceX * Math.cos(theta);
    const y = center[1] + distanceY * Math.sin(theta);
    coords.push([x, y]);
  }
  coords.push(coords[0]); // Close the polygon

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
  };
}

// Calculate appropriate zoom level for radius
function getZoomForRadius(radiusKm: number): number {
  if (radiusKm <= 2) return 14;
  if (radiusKm <= 5) return 13;
  if (radiusKm <= 10) return 12;
  if (radiusKm <= 20) return 11;
  if (radiusKm <= 30) return 10;
  return 9;
}

export default MapWithRadius;
