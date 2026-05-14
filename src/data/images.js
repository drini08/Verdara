/**
 * All imagery is served from /public/images so it works offline and avoids
 * broken Unsplash hotlinks (404s / regional blocks).
 */
const img = (file) => `${import.meta.env.BASE_URL}images/${file}`;

export const heroImages = {
  primary: {
    src: img("aerial-fields.jpg"),
    alt: "Aerial view of green agricultural fields"
  },
  stack: [
    {
      src: img("farm-sunrise.jpg"),
      alt: "Farm landscape at sunrise"
    },
    {
      src: img("market-baskets.jpg"),
      alt: "Fresh vegetables at harvest"
    }
  ]
};

export const galleryImages = [
  {
    src: img("wheat-field.jpg"),
    alt: "Golden wheat field"
  },
  {
    src: img("greenhouse.jpg"),
    alt: "Vegetables in a greenhouse"
  },
  {
    src: img("aerial-fields.jpg"),
    alt: "Aerial view across farmland"
  },
  {
    src: img("crop-rows.jpg"),
    alt: "Rows of crops in a field"
  },
  {
    src: img("produce-market.jpg"),
    alt: "Fresh produce ready for market"
  },
  {
    src: img("irrigation.jpg"),
    alt: "Irrigation lines across a field"
  }
];

export const pillarImages = {
  intelligence: {
    src: img("aerial-fields.jpg"),
    alt: "Satellite-style view of farmland patterns"
  },
  marketplace: {
    src: img("produce-market.jpg"),
    alt: "Fresh produce at a market stall"
  },
  community: {
    src: img("farm-sunrise.jpg"),
    alt: "Farm at dawn — operations and teamwork"
  }
};

export const pageHeroImages = {
  intelligence: {
    src: img("lab-tech.jpg"),
    alt: "Crop monitoring and healthy plants"
  },
  integration: {
    src: img("irrigation.jpg"),
    alt: "Weather and technology on the farm"
  },
  marketplace: {
    src: img("market-baskets.jpg"),
    alt: "Produce baskets at a farmers market"
  },
  analyze: {
    src: img("greenhouse.jpg"),
    alt: "Close-up of crop leaves for inspection"
  }
};

export const analyzePreviewPlaceholder = {
  src: img("greenhouse.jpg"),
  alt: "Example greenhouse crop — upload your own image to analyze"
};

/** Marketplace cards — local assets only */
export const listingImages = {
  tomatoes: img("produce-market.jpg"),
  irrigationKit: img("irrigation.jpg"),
  greenhouseFilm: img("greenhouse.jpg")
};
