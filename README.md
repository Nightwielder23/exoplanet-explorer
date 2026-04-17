# Exoplanet Explorer

An interactive web app for exploring confirmed exoplanets with D3-powered visualizations.

## Tech Stack

- [Vite](https://vitejs.dev/) — build tool and dev server
- [React 18](https://react.dev/) — UI library
- [Tailwind CSS 3](https://tailwindcss.com/) — utility-first styling
- [D3.js](https://d3js.org/) — data-driven visualizations
- [Axios](https://axios-http.com/) — HTTP client
- [PostCSS](https://postcss.org/) + [Autoprefixer](https://github.com/postcss/autoprefixer)

## Data Source

Data is fetched live from the [NASA Exoplanet Archive TAP API](https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html). **No API key is required** — the endpoint is public.

## Scripts

```bash
npm run dev      # start the dev server
npm run build    # production build to dist/
npm run preview  # preview the production build
npm run lint     # run ESLint
```

## Deployment

Deployable to [Vercel](https://vercel.com/) out of the box. `vercel.json` rewrites all routes to `index.html` so client-side routing works on refresh.
