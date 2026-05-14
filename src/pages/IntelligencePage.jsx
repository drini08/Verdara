import IntelligenceSection from "../components/sections/IntelligenceSection";
import { pageHeroImages } from "../data/images";

function IntelligencePage() {
  return (
    <>
      <section className="page-hero">
        <div className="container page-hero-split">
          <div>
            <p className="eyebrow">Verdara intelligence</p>
            <h1 className="headline-animate">
              AI and satellite crop monitoring dashboard
            </h1>
          </div>
          <div className="page-hero-visual media-frame">
            <img
              src={pageHeroImages.intelligence.src}
              alt={pageHeroImages.intelligence.alt}
              loading="lazy"
              width={1000}
              height={750}
            />
          </div>
        </div>
      </section>
      <IntelligenceSection />
    </>
  );
}

export default IntelligencePage;
