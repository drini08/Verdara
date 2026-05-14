import { pillarImages } from "../../data/images";
import { useReveal } from "../../hooks/useReveal";

const pillars = [
  {
    key: "intelligence",
    title: "Intelligence Engine",
    description:
      "AI disease detection, satellite-driven field analysis, and weather-aware risk forecasting."
  },
  {
    key: "marketplace",
    title: "Digital Marketplace",
    description:
      "A direct channel for farmers, suppliers, and buyers to trade with better transparency."
  },
  {
    key: "community",
    title: "Community Management",
    description:
      "Decision support for municipalities and agricultural institutions serving local farming networks."
  }
];

function PillarsSection() {
  const { ref, visible } = useReveal();

  return (
    <section ref={ref} className="pillars">
      <div className="container">
        <p className="eyebrow">Platform foundations</p>
        <h2 className={`reveal ${visible ? "is-visible" : ""}`}>
          Architecture prepared for Verdara core modules
        </h2>
        <div className="pillar-grid">
          {pillars.map((pillar, index) => {
            const img = pillarImages[pillar.key];
            return (
              <article
                key={pillar.title}
                className={`pillar-card reveal ${visible ? "is-visible" : ""}`}
                style={{
                  transitionDelay: visible ? `${90 + index * 70}ms` : undefined
                }}
              >
                <div className="pillar-card-image media-frame">
                  <img src={img.src} alt={img.alt} loading="lazy" />
                </div>
                <div className="pillar-card-body">
                  <h3>{pillar.title}</h3>
                  <p>{pillar.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default PillarsSection;
