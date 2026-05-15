import React from "react";
import SatelliteMap from "../components/SatelliteMap";

function SatellitePage() {
  return (
    <>
      <section className="page-hero">
        <div className="container page-hero-split">
          <div>
            <p className="eyebrow">Satellite Analysis</p>
            <h1 className="headline-animate">Monitor Crop Health from Space</h1>
            <p className="hero-description" style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>
              Draw a polygon over your field to analyze the latest Sentinel-2 satellite imagery. 
              We calculate the Normalized Difference Vegetation Index (NDVI) to highlight plant health.
            </p>
          </div>
        </div>
      </section>

      <section className="analyze-section" style={{ paddingBottom: "4rem" }}>
        <div className="container">
          <div className="table-card" style={{ padding: "0" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
                  <line x1="9" y1="3" x2="9" y2="21"></line>
                  <line x1="15" y1="3" x2="15" y2="21"></line>
                </svg>
                Field Map
              </h3>
              <p className="hint" style={{ marginTop: "0.25rem" }}>
                Use the drawing tools on the left to select your field area.
              </p>
            </div>
            <SatelliteMap />
            <div style={{ padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: "500", color: "var(--text-secondary)" }}>NDVI Legend:</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "16px", height: "16px", borderRadius: "4px", background: "#ff0000" }}></div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Poor</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "16px", height: "16px", borderRadius: "4px", background: "#ffff00" }}></div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Fair</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "16px", height: "16px", borderRadius: "4px", background: "#00ff00" }}></div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Healthy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default SatellitePage;
