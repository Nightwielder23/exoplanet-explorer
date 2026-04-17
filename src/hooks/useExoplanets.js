import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL =
  '/api/nasa/TAP/sync?query=select+pl_name,ra,dec,pl_masse,pl_rade,pl_orbper,sy_dist,disc_year,discoverymethod,st_spectype,pl_eqt+from+pscomppars+where+ra+is+not+null+and+dec+is+not+null&format=json';

let cachedData = null;
let inflightRequest = null;

const transform = (rows) =>
  rows.map((row) => ({
    name: row.pl_name,
    ra: row.ra,
    dec: row.dec,
    mass: row.pl_masse,
    radius: row.pl_rade,
    orbitalPeriod: row.pl_orbper,
    distance: row.sy_dist,
    discoveryYear: row.disc_year,
    discoveryMethod: row.discoverymethod,
    starType: row.st_spectype,
    equilibriumTemp: row.pl_eqt,
  }));

export function useExoplanets() {
  const [data, setData] = useState(cachedData);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cachedData) return;

    let cancelled = false;

    if (!inflightRequest) {
      inflightRequest = axios
        .get(API_URL)
        .then((res) => {
          const transformed = transform(res.data);
          cachedData = transformed;
          console.log(`Loaded ${transformed.length} exoplanets`);
          return transformed;
        })
        .finally(() => {
          inflightRequest = null;
        });
    }

    inflightRequest
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}

export default useExoplanets;
