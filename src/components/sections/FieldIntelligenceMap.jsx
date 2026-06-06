import { useEffect, useMemo, useRef, useState } from "react";
import { analyzeField } from "../../services/geeService";
import { loadGoogleMaps } from "../../services/googleMapsLoader";
import { fetchRadarOverlay } from "../../services/weatherOverlayService";

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
const googleMapsMapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID?.trim();
const useAdvancedMarkers = Boolean(googleMapsMapId);

const cropOptions = [
  { value: "potato", label: "Potato" },
  { value: "wheat", label: "Wheat" },
  { value: "corn", label: "Corn" },
  { value: "pepper", label: "Pepper" },
  { value: "tomato", label: "Tomato" }
];
const overlayModes = [
  { value: "satellite", label: "Satellite" },
  { value: "rain", label: "Rain" }
];

function clearMapMarker(marker) {
  if (!marker) return;
  if (typeof marker.setMap === "function") {
    marker.setMap(null);
    return;
  }
  marker.map = null;
}

function createPointMarker(google, map, point, index) {
  const advancedMarker = google.maps.marker?.AdvancedMarkerElement;
  if (advancedMarker && googleMapsMapId) {
    const content = document.createElement("div");
    content.className = "field-point-marker";
    content.textContent = `${index + 1}`;

    return new advancedMarker({
      map,
      position: point,
      title: `Boundary point ${index + 1}`,
      content
    });
  }

  return new google.maps.Marker({
    position: point,
    label: `${index + 1}`,
    map
  });
}

function polygonAreaHectares(points) {
  if (points.length < 3) return 0;

  const earthRadius = 6378137;
  const radians = points.map((point) => ({
    lat: point.lat * Math.PI / 180,
    lng: point.lng * Math.PI / 180
  }));
  let area = 0;

  for (let index = 0; index < radians.length; index += 1) {
    const next = (index + 1) % radians.length;
    area += (radians[next].lng - radians[index].lng) *
      (2 + Math.sin(radians[index].lat) + Math.sin(radians[next].lat));
  }

  return Math.abs(area * earthRadius * earthRadius / 2) / 10000;
}

function FieldIntelligenceMap() {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const googleRef = useRef(null);
  const geocoderRef = useRef(null);
  const polygonRef = useRef(null);
  const markerRefs = useRef([]);
  const weatherOverlayRef = useRef(null);
  const weatherAbortRef = useRef(null);
  const drawModeRef = useRef(true);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [points, setPoints] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [drawMode, setDrawMode] = useState(true);
  const [crop, setCrop] = useState("potato");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [overlayMode, setOverlayMode] = useState("satellite");
  const [overlayError, setOverlayError] = useState("");
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [overlayAttribution, setOverlayAttribution] = useState("");

  const areaHectares = useMemo(() => polygonAreaHectares(points), [points]);

  useEffect(() => {
    drawModeRef.current = drawMode;
  }, [drawMode]);

  useEffect(() => {
    let cancelled = false;
    let clickListener;

    loadGoogleMaps(googleMapsApiKey, { useAdvancedMarkers })
      .then((google) => {
        if (cancelled || !mapNodeRef.current) return;

        try {
          googleRef.current = google;
          geocoderRef.current = new google.maps.Geocoder();
          mapRef.current = new google.maps.Map(mapNodeRef.current, {
            center: { lat: 47.1625, lng: 19.5033 },
            zoom: 9,
            ...(googleMapsMapId ? { mapId: googleMapsMapId } : {}),
            mapTypeId: "satellite",
            streetViewControl: false,
            fullscreenControl: true,
            mapTypeControl: true,
            clickableIcons: false
          });

          clickListener = mapRef.current.addListener("click", (event) => {
            if (!event.latLng) return;
            setPoints((current) => {
              if (!drawModeRef.current) return current;
              return [
                ...current,
                {
                  lat: Number(event.latLng.lat().toFixed(7)),
                  lng: Number(event.latLng.lng().toFixed(7))
                }
              ];
            });
            setAnalysis(null);
            setAnalysisError("");
          });

          setMapReady(true);
        } catch (err) {
          setMapError(err.message || "Google Maps could not initialize.");
        }
      })
      .catch((err) => setMapError(err.message));

    return () => {
      cancelled = true;
      if (clickListener) clickListener.remove();
    };
  }, []);

  useEffect(() => () => {
    if (weatherAbortRef.current) {
      weatherAbortRef.current.abort();
    }
  }, []);

  useEffect(() => {
    const google = googleRef.current;
    const map = mapRef.current;
    if (!google || !map) return;

    if (polygonRef.current) {
      polygonRef.current.setMap(null);
    }
    markerRefs.current.forEach(clearMapMarker);
    markerRefs.current = [];

    if (points.length > 0) {
      polygonRef.current = new google.maps.Polygon({
        paths: points,
        strokeColor: "#ffffff",
        strokeOpacity: 0.95,
        strokeWeight: 3,
        fillColor: "#2f7d46",
        fillOpacity: 0.22,
        map
      });

      markerRefs.current = points.map((point, index) => createPointMarker(google, map, point, index));
    }
  }, [points]);

  useEffect(() => {
    const google = googleRef.current;
    const map = mapRef.current;
    if (!google || !map || !mapReady) return undefined;

    const clearOverlay = () => {
      if (weatherOverlayRef.current) {
        map.overlayMapTypes.clear();
        weatherOverlayRef.current = null;
      }
      setOverlayAttribution("");
    };

    const abortController = new AbortController();
    weatherAbortRef.current?.abort();
    weatherAbortRef.current = abortController;
    setOverlayError("");

    if (overlayMode === "satellite") {
      clearOverlay();
      setOverlayLoading(false);
      return () => abortController.abort();
    }

    const applyRainOverlay = async () => {
      setOverlayLoading(true);
      clearOverlay();
      try {
        const radar = await fetchRadarOverlay({ signal: abortController.signal });
        if (abortController.signal.aborted) return;

        weatherOverlayRef.current = new google.maps.ImageMapType({
          tileSize: new google.maps.Size(256, 256),
          name: "Rain Radar",
          opacity: 0.72,
          getTileUrl: (point, zoom) => radar.tileUrlTemplate
            .replace("{z}", String(zoom))
            .replace("{x}", String(point.x))
            .replace("{y}", String(point.y))
        });
        map.overlayMapTypes.clear();
        map.overlayMapTypes.push(weatherOverlayRef.current);
        setOverlayAttribution(radar.attribution);
      } catch (error) {
        if (!abortController.signal.aborted) {
          setOverlayError(error.message);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setOverlayLoading(false);
        }
      }
    };

    const applyWindOverlay = async () => {
      setOverlayLoading(true);
      clearOverlay();
      try {
        const bounds = map.getBounds();
        if (!bounds) {
          throw new Error("Move or zoom the map once to load wind data.");
        }

        const northEast = bounds.getNorthEast();
        const southWest = bounds.getSouthWest();
        const windGrid = await fetchWindGrid({
          bounds: {
            north: northEast.lat(),
            south: southWest.lat(),
            east: northEast.lng(),
            west: southWest.lng()
          },
          rows: 3,
          cols: 3,
          signal: abortController.signal
        });
        if (abortController.signal.aborted) return;

        weatherMarkerRefs.current = windGrid.items.map((item) => createWindMarker(google, map, item));
        setOverlayAttribution(windGrid.attribution);
      } catch (error) {
        if (!abortController.signal.aborted) {
          setOverlayError(error.message);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setOverlayLoading(false);
        }
      }
    };

    const applyThermalOverlay = async () => {
      setOverlayLoading(true);
      clearOverlay();
      try {
        const bounds = map.getBounds();
        if (!bounds) {
          throw new Error("Move or zoom the map once to load thermal data.");
        }

        const northEast = bounds.getNorthEast();
        const southWest = bounds.getSouthWest();
        const thermalGrid = await fetchThermalGrid({
          bounds: {
            north: northEast.lat(),
            south: southWest.lat(),
            east: northEast.lng(),
            west: southWest.lng()
          },
          rows: 3,
          cols: 3,
          signal: abortController.signal
        });
        if (abortController.signal.aborted) return;

        const thermalBounds = buildCellBounds(thermalGrid.items);
        weatherShapeRefs.current = thermalGrid.items.map((item, index) => {
          const color = thermalColor(item.soilTemperatureC);
          return new google.maps.Rectangle({
            bounds: thermalBounds[index],
            map,
            strokeOpacity: 0,
            fillColor: color,
            fillOpacity: 0.34
          });
        });
        setOverlayAttribution(thermalGrid.attribution);
      } catch (error) {
        if (!abortController.signal.aborted) {
          setOverlayError(error.message);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setOverlayLoading(false);
        }
      }
    };

    const applyMoistureOverlay = async () => {
      setOverlayLoading(true);
      clearOverlay();
      try {
        const bounds = map.getBounds();
        if (!bounds) {
          throw new Error("Move or zoom the map once to load moisture data.");
        }

        const northEast = bounds.getNorthEast();
        const southWest = bounds.getSouthWest();
        const moistureGrid = await fetchMoistureGrid({
          bounds: {
            north: northEast.lat(),
            south: southWest.lat(),
            east: northEast.lng(),
            west: southWest.lng()
          },
          rows: 3,
          cols: 3,
          signal: abortController.signal
        });
        if (abortController.signal.aborted) return;

        const moistureBounds = buildCellBounds(moistureGrid.items);
        weatherShapeRefs.current = moistureGrid.items.map((item, index) => {
          const color = moistureColor(item.soilMoisturePercent);
          return new google.maps.Rectangle({
            bounds: moistureBounds[index],
            map,
            strokeOpacity: 0,
            fillColor: color,
            fillOpacity: 0.32
          });
        });
        setOverlayAttribution(moistureGrid.attribution);
      } catch (error) {
        if (!abortController.signal.aborted) {
          setOverlayError(error.message);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setOverlayLoading(false);
        }
      }
    };

    if (overlayMode === "rain") {
      applyRainOverlay();
    }

    return () => {
      abortController.abort();
    };
  }, [mapReady, overlayMode]);

  useEffect(() => {
    if (polygonRef.current) {
      polygonRef.current.setOptions({
        strokeColor: drawMode ? "#ffffff" : "#2f7d46",
        fillOpacity: drawMode ? 0.22 : 0.28
      });
    }
  }, [drawMode]);

  function clearField() {
    setPoints([]);
    setAnalysis(null);
    setAnalysisError("");
    setDrawMode(true);
  }

  function undoPoint() {
    setPoints((current) => current.slice(0, -1));
    setAnalysis(null);
    setAnalysisError("");
    setDrawMode(true);
  }

  function startDrawing() {
    setDrawMode(true);
    setAnalysis(null);
    setAnalysisError("");
  }

  function finishPolygon() {
    if (points.length < 3) {
      setAnalysisError("Draw at least 3 points before finishing the field boundary.");
      return;
    }

    setDrawMode(false);
    setAnalysisError("");
  }

  function locateUser() {
    if (!navigator.geolocation || !mapRef.current) return;

    navigator.geolocation.getCurrentPosition((position) => {
      mapRef.current.setCenter({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
      mapRef.current.setZoom(15);
    });
  }

  async function searchLocation(event) {
    event.preventDefault();
    if (!searchValue.trim() || !geocoderRef.current || !mapRef.current) return;

    geocoderRef.current.geocode({ address: searchValue.trim() }, (results, status) => {
      if (status !== "OK" || !results?.[0]) {
        setMapError("Location not found.");
        return;
      }

      setMapError("");
      mapRef.current.fitBounds(results[0].geometry.viewport);
    });
  }

  async function runAnalysis() {
    if (points.length < 3) {
      setAnalysisError("Draw at least 3 points around the field.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError("");

    try {
      const result = await analyzeField({ polygon: points, crop });
      setAnalysis(result);
      setDrawMode(false);
    } catch (err) {
      setAnalysisError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <section className="field-intelligence-section">
      <div className="container field-intelligence-layout">
        <div className="field-map-shell">
          <div className="field-map-toolbar">
            <form className="field-search" onSubmit={searchLocation}>
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search farm, village, address, or coordinates"
                aria-label="Search map location"
              />
              <button type="submit" disabled={!mapReady}>Search</button>
            </form>
            <button type="button" onClick={locateUser} disabled={!mapReady}>Locate</button>
            <button
              type="button"
              className={drawMode ? "tool-active" : ""}
              onClick={startDrawing}
              disabled={!mapReady}
            >
              Polygon
            </button>
            <button
              type="button"
              className={!drawMode ? "tool-active" : ""}
              onClick={() => setDrawMode(false)}
              disabled={!mapReady}
            >
              Pan
            </button>
            <button type="button" onClick={finishPolygon} disabled={points.length < 3}>Finish</button>
            <button type="button" onClick={undoPoint} disabled={!points.length}>Undo</button>
            <button type="button" onClick={clearField} disabled={!points.length && !analysis}>Clear</button>
          </div>
          <div className="field-overlay-toolbar">
            {overlayModes.map((mode) => (
              <button
                key={mode.value}
                type="button"
                className={overlayMode === mode.value ? "overlay-active" : ""}
                onClick={() => setOverlayMode(mode.value)}
                disabled={!mapReady}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="field-map-frame">
            <div className="field-map" ref={mapNodeRef} />
            {mapError && <div className="map-empty-state">{mapError}</div>}
            {!mapError && !mapReady && <div className="map-empty-state">Loading satellite map...</div>}
            {!mapError && mapReady && (overlayLoading || overlayError || overlayAttribution) && (
              <div className="map-overlay-status">
                {overlayLoading ? <span>Loading {overlayMode} layer...</span> : null}
                {!overlayLoading && overlayError ? <span>{overlayError}</span> : null}
                {!overlayLoading && !overlayError && overlayAttribution ? <span>{overlayAttribution}</span> : null}
              </div>
            )}
          </div>
        </div>

        <aside className="field-analysis-panel">
          <p className="eyebrow">Field intelligence</p>
          <h2>Draw a field boundary and scan crop stress</h2>

          <div className="field-metrics">
            <div>
              <span>Boundary points</span>
              <strong>{points.length}</strong>
            </div>
            <div>
              <span>Estimated area</span>
              <strong>{areaHectares.toFixed(areaHectares >= 10 ? 1 : 2)} ha</strong>
            </div>
          </div>

          <label className="field-control">
            <span>Crop plan</span>
            <select value={crop} onChange={(event) => setCrop(event.target.value)}>
              {cropOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <button
            className="primary-action"
            type="button"
            onClick={runAnalysis}
            disabled={isAnalyzing || points.length < 3}
          >
            {isAnalyzing ? "Analyzing field..." : "Analyze selected field"}
          </button>

          {analysisError && <p className="form-error">{analysisError}</p>}

          {analysis ? (
            <div className="field-results">
              <div className="field-score">
                <span>Crop condition score</span>
                <strong>{analysis.healthScore}/100</strong>
              </div>
              <article className="field-summary-card">
                <strong>{analysis.suitability?.label || "Field advisory"}</strong>
                <p>{analysis.summary}</p>
                {analysis.suitability?.score && (
                  <span>Suitability for {analysis.crop}: {analysis.suitability.score}/100</span>
                )}
              </article>
              <div className="satellite-metrics">
                <div>
                  <span>Imagery source</span>
                  <strong>Earth Engine</strong>
                </div>
              </div>
              {analysis.satelliteMetrics && (
                <div className="vegetation-index-grid">
                  <div className="vegetation-index-card">
                    <span>NDVI</span>
                    <strong>{analysis.satelliteMetrics.ndviMean.toFixed(2)}</strong>
                  </div>
                  <div className="vegetation-index-card">
                    <span>NDMI</span>
                    <strong>{analysis.satelliteMetrics.ndmiMean.toFixed(2)}</strong>
                  </div>
                </div>
              )}
              {analysis.satelliteError && (
                <p className="field-warning">{analysis.satelliteError}</p>
              )}
              {analysis.recommendations?.length > 0 && (
                <div className="recommendation-list">
                  {analysis.recommendations.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="hint">
              Click around the field edge on the satellite map. Close the boundary by pressing Analyze after at least three points.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}

export default FieldIntelligenceMap;
