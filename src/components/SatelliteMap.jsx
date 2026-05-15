import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "leaflet/dist/leaflet.css";

// This component handles the geoman controls and events
const GeomanControl = ({ onPolygonCreated }) => {
  const map = useMap();

  useEffect(() => {
    // Add controls
    map.pm.addControls({
      position: "topleft",
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: true,
      drawPolygon: true,
      drawCircle: false,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: true,
    });

    // Handle create event
    map.on("pm:create", (e) => {
      const layer = e.layer;
      const geojson = layer.toGeoJSON();
      // Extract coordinates: GeoJSON polygons are [[[lng, lat], ...]]
      // We need just the outer ring for GEE
      if (geojson.geometry.type === "Polygon") {
        const coordinates = geojson.geometry.coordinates[0];
        onPolygonCreated(coordinates);
      }
    });

    return () => {
      map.pm.removeControls();
      map.off("pm:create");
    };
  }, [map, onPolygonCreated]);

  return null;
};

const SatelliteMap = () => {
  const [tileUrl, setTileUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePolygonCreated = async (coordinates) => {
    setLoading(true);
    setError(null);
    try {
      // We will send coordinates to the FastAPI backend running on port 8000
      const response = await fetch("http://localhost:8000/analyze-satellite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ coordinates }),
      });

      if (!response.ok) {
        throw new Error("Failed to get satellite data");
      }

      const data = await response.json();
      if (data.tile_url) {
        setTileUrl(data.tile_url);
      } else {
        throw new Error("No tile URL returned");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to analyze area. Ensure the backend is running and valid coordinates were provided.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "600px", borderRadius: "12px", overflow: "hidden" }}>
      {loading && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(255, 255, 255, 0.8)", zIndex: 1000,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
        }}>
          <div className="btn-spinner" style={{ borderColor: "#22c55e", borderRightColor: "transparent", width: "40px", height: "40px", borderWidth: "4px" }}></div>
          <p style={{ marginTop: "16px", fontWeight: "600", color: "#374151" }}>Processing Satellite Imagery...</p>
        </div>
      )}
      {error && (
        <div style={{
          position: "absolute", top: "10px", left: "50%", transform: "translateX(-50%)",
          background: "#fee2e2", color: "#ef4444", padding: "8px 16px", borderRadius: "8px", zIndex: 1000,
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
        }}>
          {error}
        </div>
      )}
      <MapContainer
        center={[37.7749, -122.4194]} // Default center
        zoom={13}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
        />
        <GeomanControl onPolygonCreated={handlePolygonCreated} />
        {tileUrl && (
          <TileLayer
            url={tileUrl}
            attribution="Google Earth Engine - NDVI"
            opacity={0.7}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default SatelliteMap;
