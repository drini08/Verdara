# Verdara Frontend Base

Minimal and clean frontend foundation for Verdara, built with React + Vite and intentionally low dependency count.

## Why this setup

- **Low library risk:** only React, React DOM, Vite, and Vite React plugin.
- **Fast startup:** simple development server and hot reload.
- **Scalable structure:** ready for AI insights, marketplace flows, and institutional dashboards.

## Project architecture

```text
src/
  components/
    layout/
      Navbar.jsx
    sections/
      HeroSection.jsx
      PillarsSection.jsx
  features/
    intelligence/      # disease detection, weather risk, satellite analytics (next phase)
    marketplace/       # listings, offers, buyers/suppliers (next phase)
    institutions/      # municipality and agri-institution management (next phase)
  App.jsx
  main.jsx
  styles.css
```

## First run

1. Install dependencies:
   - `npm install`
2. Start dev server:
   - `npm run dev`
3. Open the local URL shown by Vite.

## Current UI included

- Clean navigation bar
- Agriculture-focused hero section inspired by your shared layout
- Platform architecture section showing Verdara core pillars

## Next build steps

- Replace hero image with your own brand image asset
- Add reusable design tokens (colors, spacing, typography)
- Build feature folders into real pages (Insights, Marketplace, Partners)
- Add API layer for weather, satellite, and prediction services
