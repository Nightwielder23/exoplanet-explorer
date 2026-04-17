# Exoplanet Explorer

Exoplanet Explorer is an interactive star map built on top of NASA's confirmed exoplanet archive. Every single one of the 6,160+ confirmed exoplanets is plotted as a glowing dot on a zoomable, pannable 2D celestial map using its actual right ascension and declination coordinates. Click any dot and you get the full data sheet for that planet. Filter, search, compare, and explore the entire archive in real time.

This started as a portfolio project with a simple goal: build something with the NASA API that actually looks and feels impressive, not just another APOD image viewer.

## Live Demo

**https://exoplanet-explorer-omega.vercel.app**

---

## The Star Map

The core of the app is a canvas-based star map rendering thousands of planets at once with smooth zoom and pan. Planets glow in different colors depending on their type or temperature zone, and the map updates instantly as you apply filters. Zoom into the Kepler field in the upper right and you will see over 2,700 planets crammed into a tiny patch of sky, which is a direct result of how the Kepler Space Telescope observed a single fixed region for years.

The map sits inside an observable sky boundary showing the full RA/Dec coordinate range. Outside the boundary is a live twinkling star field where stars randomly appear, brighten, and fade out across the background.

## Exploring Planets

Clicking any planet opens a detail panel on the right showing everything the NASA archive has on it: host star type, distance in parsecs, mass and radius in Earth units, orbital period, equilibrium temperature, discovery method, discovery year, constellation, and coordinates. At the bottom you get three similar planets based on type and radius, each clickable. Every planet also links directly to its NASA Archive page.

Any planet can be shared via URL. Selecting a planet updates the address bar with a query parameter, so you can paste the link and the correct planet will auto-select when the page loads. The page title updates too.

## Filtering and Search

The filter panel on the left lets you narrow the map by planet type, habitability zone, discovery method, and distance range. There is also a search bar with live autocomplete that matches planet names as you type. All filters combine and the map updates in real time, fading planets in and out as they enter and leave the active set. A badge on the filter tab shows when any filter is active, and pressing R on the keyboard resets everything instantly.

## Visualization Modes

**By Type** colors planets by size category ranging from Sub Earth up through Hot Jupiter, each with its own color in the legend.

**By Habitability** colors planets by their equilibrium temperature zone: optimistic habitable zone, too hot, too cold, or unknown.

**Highlight HZ** dims all non-habitable planets to 20% opacity and makes habitable zone planets glow bright green, so you can immediately see where in the sky potentially habitable worlds are concentrated.

**Heatmap** draws a density overlay across the sky using kernel density estimation, showing blue-to-white gradients where planet discoveries are most concentrated. The Kepler field lights up dramatically.

**Constellations** overlays five major constellations with labeled line patterns: Orion, Ursa Major, Cassiopeia, Scorpius, and Leo.

## Comparison Tool

Pressing the Compare button in the header activates comparison mode. Click any two planets and a panel slides up from the bottom showing them side by side with all their stats. Winning values are highlighted in green using sensible rules: closer distance wins, larger mass and radius win, earlier discovery year wins, and whichever temperature is closer to Earth's equilibrium wins.

## Statistics Dashboard

The stats panel in the bottom right shows live statistics based on your current filter set. It includes a horizontal bar chart of the top five discovery methods, a sparkline chart showing the number of discoveries per year from 1992 to today with the peak year marked, and four summary cards showing the most common planet type, average distance, habitable zone count, and earliest discovery year. All stats update as you filter.

## Other Features

The mini map in the bottom center shows the full sky at all times with a rectangle indicating your current viewport position. The featured planet of the day is shown in the header and changes daily. The random planet button picks a random planet from the current filtered set and flies the map to it with a smooth animated zoom transition. The export button captures the current canvas view and downloads it as a PNG. Keyboard shortcuts are listed in the help panel: Esc closes open panels, F focuses the search bar, R resets filters, C toggles constellations, and H toggles the heatmap.

## How It Works

The visualization runs on an HTML5 Canvas renderer rather than SVG, which is what makes 6,000+ animated glowing dots performant. The app uses a two-canvas system: one canvas handles the background star field animation and one handles all the planet rendering. They run independent animation loops so the twinkling stars never interfere with the planet layer.

In production, a Vercel serverless function proxies all requests to the NASA Exoplanet Archive TAP API. The archive does not send CORS headers to browser clients, so the proxy is the only way to fetch data directly in a deployed web app without an intermediate backend.

## Tech Stack

React 18, D3.js, Tailwind CSS, Axios, Vite, deployed on Vercel.

## Running Locally

```bash
npm install
npm run dev
```

The dev server runs at http://localhost:5173 and proxies NASA API requests through /api/nasa via the Vite config so CORS is handled locally too.

---

Built by Ayan Deshpande. Data sourced from the NASA Exoplanet Archive, updated automatically as new planets are confirmed.