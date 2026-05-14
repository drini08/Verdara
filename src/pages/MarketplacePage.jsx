import Marketplace from "../components/Marketplace";
import { pageHeroImages } from "../data/images";

function MarketplacePage() {
  return (
    <>
      <section className="page-hero">
        <div className="container page-hero-split">
          <div>
            <p className="eyebrow">Verdara marketplace</p>
            <h1 className="headline-animate">
              Direct trading between farmers, suppliers, and buyers
            </h1>
          </div>
          <div className="page-hero-visual media-frame">
            <img
              src={pageHeroImages.marketplace.src}
              alt={pageHeroImages.marketplace.alt}
              loading="lazy"
              width={1000}
              height={750}
            />
          </div>
        </div>
      </section>
      <Marketplace />
    </>
  );
}

export default MarketplacePage;
