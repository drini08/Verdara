import { listingImages } from "./images";

export const diseaseAlerts = [
  { zone: "North Parcel A1", disease: "Leaf Rust", confidence: 91, risk: "high" },
  { zone: "Greenhouse B2", disease: "Powdery Mildew", confidence: 84, risk: "medium" },
  { zone: "South Terrace C4", disease: "Blight Pattern", confidence: 78, risk: "medium" }
];

export const satelliteSummary = {
  ndviAverage: 0.72,
  moistureIndex: 0.61,
  cloudCoverage: 14
};

export const weatherForecast = [
  { day: "Today", tempC: 24, rainChance: 25, windKmh: 14 },
  { day: "Tomorrow", tempC: 22, rainChance: 48, windKmh: 17 },
  { day: "Wednesday", tempC: 21, rainChance: 62, windKmh: 20 }
];

export const marketplaceListings = [
  {
    id: "mk-1",
    title: "Organic Tomatoes (Grade A)",
    type: "Sell",
    quantity: "1.2 tons",
    location: "Prizren",
    imageUrl: listingImages.tomatoes
  },
  {
    id: "mk-2",
    title: "Drip Irrigation Kit",
    type: "Buy",
    quantity: "40 units",
    location: "Ferizaj",
    imageUrl: listingImages.irrigationKit
  },
  {
    id: "mk-3",
    title: "Greenhouse Plastic Film",
    type: "Supply",
    quantity: "600 m",
    location: "Peje",
    imageUrl: listingImages.greenhouseFilm
  }
];

export const integrationStatus = [
  { source: "Weather API", status: "Connected", freshness: "2 min ago" },
  { source: "IoT Soil Sensors", status: "Connected", freshness: "Live stream" },
  { source: "Sentinel-2 Feed", status: "Scheduled", freshness: "Next pass in 5h" }
];
