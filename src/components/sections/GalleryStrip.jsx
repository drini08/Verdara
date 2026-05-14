import { galleryImages } from "../../data/images";
import { useReveal } from "../../hooks/useReveal";

function GalleryStrip() {
  const { ref, visible } = useReveal();

  return (
    <section
      ref={ref}
      className="gallery-strip"
      aria-label="Field and farm photography"
    >
      <div className="container">
        <p className="eyebrow">On the ground</p>
        <h2
          className={`reveal ${visible ? "is-visible" : ""}`}
          style={{ transitionDelay: visible ? "70ms" : undefined }}
        >
          Agriculture in focus
        </h2>
      </div>
      <div className="container gallery-strip-inner">
        {galleryImages.map((item, index) => (
          <figure
            key={item.src}
            className={`gallery-cell media-frame reveal ${visible ? "is-visible" : ""}`}
            style={{
              transitionDelay: visible ? `${100 + index * 50}ms` : undefined
            }}
          >
            <img src={item.src} alt={item.alt} loading="lazy" />
          </figure>
        ))}
      </div>
    </section>
  );
}

export default GalleryStrip;
