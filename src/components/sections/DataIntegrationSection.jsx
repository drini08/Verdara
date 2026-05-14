import {
  getIntegrationStatus,
  getWeatherForecast
} from "../../services/integrationService";
import { useReveal } from "../../hooks/useReveal";

function DataIntegrationSection() {
  const integrations = getIntegrationStatus();
  const forecast = getWeatherForecast();
  const { ref, visible } = useReveal();

  return (
    <section ref={ref} id="integration" className="integration-section">
      <div className="container integration-layout">
        <div>
          <p className="eyebrow">Data integration</p>
          <h2 className={`reveal ${visible ? "is-visible" : ""}`}>
            Weather, IoT, and satellite feeds in one operational view
          </h2>
          <div
            className={`table-card reveal ${visible ? "is-visible" : ""}`}
            style={{ transitionDelay: visible ? "80ms" : undefined }}
          >
            <h3>Connector health</h3>
            {integrations.map((item) => (
              <div className="connector-row" key={item.source}>
                <span>{item.source}</span>
                <span>{item.status}</span>
                <span>{item.freshness}</span>
              </div>
            ))}
          </div>
        </div>

        <aside
          className={`forecast-card reveal ${visible ? "is-visible" : ""}`}
          style={{ transitionDelay: visible ? "140ms" : undefined }}
        >
          <h3>3-day weather preview</h3>
          {forecast.map((day) => (
            <div key={day.day} className="forecast-row">
              <span>{day.day}</span>
              <span>{day.tempC}C</span>
              <span>Rain {day.rainChance}%</span>
              <span>Wind {day.windKmh} km/h</span>
            </div>
          ))}
          <p className="hint">
            Ready to connect a live forecast API and map risk rules by crop
            type.
          </p>
        </aside>
      </div>
    </section>
  );
}

export default DataIntegrationSection;
