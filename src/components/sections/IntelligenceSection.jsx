import {
  getDiseaseAlerts,
  getSatelliteSummary
} from "../../services/intelligenceService";
import { useReveal } from "../../hooks/useReveal";
import WeatherRiskCard from "./WeatherRiskCard";

function IntelligenceSection() {
  const alerts = getDiseaseAlerts();
  const summary = getSatelliteSummary();
  const { ref, visible } = useReveal();

  return (
    <section ref={ref} id="intelligence" className="dashboard-section">
      <div className="container">
        <p className="eyebrow">Intelligence system</p>
        <h2 className={`reveal ${visible ? "is-visible" : ""}`}>
          Crop risk signals powered by AI and satellite analytics
        </h2>

        <div
          className={`stats-grid reveal ${visible ? "is-visible" : ""}`}
          style={{ transitionDelay: visible ? "60ms" : undefined }}
        >
          <article className="stat-card">
            <span>NDVI Average</span>
            <strong>{summary.ndviAverage}</strong>
          </article>
          <article className="stat-card">
            <span>Moisture Index</span>
            <strong>{summary.moistureIndex}</strong>
          </article>
          <article className="stat-card">
            <span>Cloud Coverage</span>
            <strong>{summary.cloudCoverage}%</strong>
          </article>
        </div>

        <div className="intelligence-grid">
          <div
            className={`table-card reveal ${visible ? "is-visible" : ""}`}
            style={{ transitionDelay: visible ? "120ms" : undefined }}
          >
            <h3>Detected disease alerts</h3>
            <div className="table-head">
              <span>Zone</span>
              <span>Disease</span>
              <span>Confidence</span>
              <span>Risk</span>
            </div>
            {alerts.map((alert) => (
              <div className="table-row" key={`${alert.zone}-${alert.disease}`}>
                <span>{alert.zone}</span>
                <span>{alert.disease}</span>
                <span>{alert.confidence}%</span>
                <span className={`risk risk-${alert.risk}`}>{alert.risk}</span>
              </div>
            ))}
          </div>
          <WeatherRiskCard />
        </div>
      </div>
    </section>
  );
}

export default IntelligenceSection;
