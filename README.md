# Exoplanet Explorer

Exoplanet Explorer is an interactive star map that visualizes all 6,160+ NASA confirmed exoplanets in real time. Every dot on the map is a real planet plotted by its actual celestial coordinates pulled live from the NASA Exoplanet Archive. You can zoom into dense discovery fields like the Kepler field where over 2,700 planets cluster in a tiny patch of sky, pan across the full observable sky, click any planet to read its complete data sheet, and filter the entire archive instantly.

This project started as a way to build something with the NASA API that actually looks and feels impressive rather than the typical APOD image viewer that every portfolio seems to have.

## Live Demo

**https://exoplanet-explorer-omega.vercel.app**

---

## What It Does

### The Star Map

The core of the app is a D3.js canvas star map rendering 6,000+ planets simultaneously with smooth zoom and pan. Planets glow in different colors depending on their type or temperature zone, and the entire map updates instantly as you apply filters with planets fading in and out as they enter and leave the active set. Outside the observable sky boundary, real twinkling background stars appear, brighten, and fade independently to create a living star field.

### Exploring Planets

Clicking any planet opens a detail panel showing everything the NASA archive has: host star type, distance in parsecs, mass and radius in Earth units, orbital period, equilibrium temperature, discovery method, year, constellation, and coordinates. At the bottom you get three similar planets based on type and radius, each clickable. Every planet links directly to its NASA Archive page and can be shared via URL since selecting a planet updates the address bar so you can paste the link and the correct planet auto-selects on load.

### Filtering and Search

The filter panel lets you narrow the map by planet type, habitability zone, discovery method, and distance range. A search bar with live autocomplete matches planet names as you type. All filters combine and the map updates in real time. A badge on the filter tab shows how many filters are active.

### Visualization Modes

**By Type** colors planets by size category from Sub Earth up through Hot Jupiter.

**By Habitability** colors planets by equilibrium temperature zone showing optimistic habitable zone, too hot, too cold, and unknown.

**Highlight HZ** dims all non-habitable planets to 20% opacity and makes habitable zone planets glow bright green so you can immediately see where potentially habitable worlds concentrate.

**Heatmap** draws a kernel density overlay showing where planet discoveries cluster most densely across the sky. The Kepler field lights up dramatically.

**Constellations** overlays five major constellations with labeled line patterns including Orion, Ursa Major, Cassiopeia, Scorpius, and Leo.

### Comparison Tool

Clicking Compare and selecting two planets brings up a side by side panel showing all stats with winning values highlighted in green using sensible rules: closer distance wins, larger mass and radius win, earlier discovery year wins, and whichever temperature is closer to Earth equilibrium wins.

### Statistics Dashboard

The stats panel shows live statistics based on your current filters including a discovery method breakdown chart, a discoveries by year sparkline from 1992 to today, and summary cards for most common type, average distance, habitable zone count, earliest discovery, and closest planet to Earth.

### Other Features

A mini map in the bottom center shows the full sky at all times with a rectangle indicating your current viewport. The featured planet of the day changes daily. The random planet button picks a random planet from the current filtered set and flies the map to it with an animated zoom transition, then zooms back out when you close the sidebar. The export button captures the current canvas as a PNG. Keyboard shortcuts throughout: Esc closes panels, F focuses search, R resets filters, C toggles constellations, H toggles heatmap. Ambient background music and UI sound effects are available as optional toggles.

---

## How It Works

The visualization uses an HTML5 Canvas renderer instead of SVG which is what makes rendering 6,000+ animated glowing dots performant in real time. The app uses two separate canvas layers: one for the background star field animation and one for the planet rendering. They run independent animation loops so the twinkling stars never interfere with the planet layer.

In production a Vercel serverless function proxies all requests to the NASA Exoplanet Archive TAP API since the archive does not send CORS headers to browser clients, making direct browser requests impossible without a proxy.

---

## Tech Stack

React 18, D3.js, Tailwind CSS, Axios, Vite, Vercel

## Data Source

NASA Exoplanet Archive TAP API at exoplanetarchive.ipac.caltech.edu. No API key required. The archive updates automatically as NASA confirms new planets.

---

## Running Locally

```bash
npm install
npm run dev
```

Runs at http://localhost:5173. The Vite dev server proxies NASA API requests through /api/nasa to handle CORS locally.

## Deployment

Deployed on Vercel. The serverless function at api/nasa.js proxies all archive requests in production. SPA routing is configured in vercel.json so direct URLs and planet sharing links work correctly on refresh.

---

Built by Ayan D. Data sourced from the NASA Exoplanet Archive, updated automatically as new planets are confirmed.

## License

MIT License. See LICENSE for details.