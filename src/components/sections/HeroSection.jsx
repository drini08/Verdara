import { heroImages } from "../../data/images";

function HeroSection() {
  return (
    <section className="hero">
      <div className="container hero-top">
        <div>
          <p className="eyebrow">Smart agriculture platform</p>
          <h1 className="headline-animate">
            Growing resilient farming through AI, satellite insight, and local
            market access.
          </h1>
        </div>
        <div className="hero-copy">
          <p>
            Verdara helps farmers detect crop disease early, predict weather
            and production risk, and connect directly with trusted buyers and
            suppliers.
          </p>
          <div className="cta-group">
            <a className="btn btn-ghost" href="/intelligence">
              Explore intelligence
            </a>
            <a className="btn btn-primary" href="/analyze">
              Analyze a photo
            </a>
          </div>
        </div>
      </div>

      <div className="container hero-visual">
        <div className="hero-visual-main media-frame">
          <img
            src={heroImages.primary.src}
            alt={heroImages.primary.alt}
            width={1400}
            height={933}
            decoding="async"
          />
        </div>
        <div className="hero-visual-stack">
          {heroImages.stack.map((item) => (
            <div key={item.src} className="hero-visual-secondary media-frame">
              <img
                src={item.src}
                alt={item.alt}
                width={900}
                height={600}
                decoding="async"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
