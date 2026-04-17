import https from 'https';

const UPSTREAM_HOST = 'exoplanetarchive.ipac.caltech.edu';
const UPSTREAM_PATH = '/TAP/sync';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const queryIndex = req.url.indexOf('?');
  const queryString = queryIndex >= 0 ? req.url.slice(queryIndex) : '';
  const upstreamPath = `${UPSTREAM_PATH}${queryString}`;

  const options = {
    hostname: UPSTREAM_HOST,
    path: upstreamPath,
    method: 'GET',
    headers: { Accept: 'application/json' },
  };

  try {
    await new Promise((resolve, reject) => {
      const upstream = https.request(options, (upstreamRes) => {
        res.statusCode = upstreamRes.statusCode ?? 502;
        upstreamRes.on('error', reject);
        upstreamRes.on('end', resolve);
        upstreamRes.pipe(res);
      });

      upstream.on('error', reject);
      upstream.end();
    });
  } catch (err) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          error: 'Upstream request to NASA Exoplanet Archive failed',
          message: err?.message ?? String(err),
        })
      );
    } else {
      res.end();
    }
  }
}
