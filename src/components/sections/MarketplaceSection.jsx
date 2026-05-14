import React, { useEffect, useState } from 'react';

import { getMarketplaceListings } from "../../services/marketplaceService";
import { useReveal } from "../../hooks/useReveal";

function MarketplaceSection() {
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { ref, visible } = useReveal();

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const data = await getMarketplaceListings();
        if (isMounted) setListings(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to load marketplace listings:', e);
        if (isMounted) setListings([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section ref={ref} id="marketplace" className="marketplace-section">
      <div className="container">
        <p className="eyebrow">Digital marketplace</p>
        <h2 className={`reveal ${visible ? "is-visible" : ""}`}>
          Farmer-to-buyer trading with fewer middlemen
        </h2>

        {isLoading ? (
          <p style={{ marginTop: 16, color: '#666' }}>Loading listings...</p>
        ) : (
          <div className="listing-grid">
            {listings.map((listing, index) => (
              <article
                key={listing.id}
                className={`listing-card reveal ${visible ? "is-visible" : ""}`}
                style={{
                  transitionDelay: visible ? `${80 + index * 60}ms` : undefined
                }}
              >
                <div className="listing-card-image media-frame">
                  <img
                    src={listing.imageUrl}
                    alt={`Photograph for ${listing.title}`}
                    loading="lazy"
                    width={800}
                    height={500}
                  />
                </div>
                <div className="listing-card-body">
                  <p className="listing-type">{listing.type}</p>
                  <h3>{listing.title}</h3>
                  <p>{listing.quantity}</p>
                  <p>{listing.location}</p>
                  <p style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
                    Posted by <strong>{listing.username || 'Unknown'}</strong>
                  </p>
                  <button type="button" className="btn btn-ghost">
                    Open listing
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default MarketplaceSection;

