import DataIntegrationSection from "../components/sections/DataIntegrationSection";
import { pageHeroImages } from "../data/images";

function IntegrationPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container page-hero-split">
          <div>
            <p className="eyebrow">Verdara integration hub</p>
            <h1 className="headline-animate">
              Weather, IoT sensors, and satellite feeds connected
            </h1>
          </div>
          <div className="page-hero-visual media-frame">
            <img
              src={pageHeroImages.integration.src}
              alt={pageHeroImages.integration.alt}
              loading="lazy"
              width={1000}
              height={750}
            />
          </div>
        </div>
      </section>
      <DataIntegrationSection />
    </>
  );
}

export default IntegrationPage;
