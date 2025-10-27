import { test } from '@playwright/test';

test('diagnostic /api/inventaire page=1', async ({ request }) => {
  const url = 'http://localhost:3000/api/inventaire?page=1&search=';
  const start = Date.now();
  const resp = await request.get(url);
  const duration = Date.now() - start;
  const status = resp.status();
  const headers = Object.fromEntries(resp.headers ? Object.entries(resp.headers()) : []);

  let bodyBuffer;
  let text = '';
  let json = null;
  let bodyLength = 0;

  try {
    bodyBuffer = await resp.body();
    bodyLength = bodyBuffer.byteLength;
    text = bodyBuffer.toString('utf8');
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  } catch (e) {
    text = '<body unavailable>';
    bodyLength = 0;
    json = null;
  }

  // Diagnostic du contenu si JSON détecté
  let jsonSummary = null;
  if (json) {
    if (Array.isArray(json)) {
      jsonSummary = `Array(${json.length})`;
    } else if (typeof json === 'object' && json !== null) {
      jsonSummary = Object.keys(json).map(key =>
        `${key}: ${Array.isArray(json[key]) ? `Array(${json[key].length})` : typeof json[key]}`
      );
    }
  }

  console.log({
    url,
    status,
    duration,
    headers,
    bodyLength,
    bodyPreview: text.slice(0, 500),
    jsonSummary
  });
  
});
test('diagnostic détaillé volume /api/inventaire page=2', async ({ request }) => {
  const url = 'http://localhost:3000/api/inventaire?page=1  &search=';
  const resp = await request.get(url);
  const text = await resp.text();
  let json = null;

  try {
    json = JSON.parse(text);
  } catch {
    console.error('Réponse non JSON');
    return;
  }

  if (!json.data || !Array.isArray(json.data)) {
    console.error('Structure inattendue : pas de tableau "data"');
    return;
  }

  // Analyse taille par champ de chaque objet dans le tableau data
  const fieldSizes = {};

  json.data.forEach((item   , index) => {
    Object.entries(item).forEach(([key, value]) => {
      let size = 0;
      try {
        size = typeof value === 'string' ? Buffer.byteLength(value, 'utf8') : Buffer.byteLength(JSON.stringify(value), 'utf8');
      } catch {
        // ignore erreurs
      }
      if (!fieldSizes[key]) {
        fieldSizes[key] = 0;
      }
      fieldSizes[key] += size;
    });
  });

  console.log({ fieldSizes });
});