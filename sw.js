// Minimal service worker: makes the app installable and shows a friendly page when offline.
// It only handles page loads on this site; API calls to Google go straight to the network.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<body style="background:#111316;color:#eceef1;font:17px system-ui;display:grid;place-items:center;min-height:90vh;text-align:center;padding:20px">' +
    '<div><h2>Ingen nettforbindelse</h2><p>RC Portal trenger nett. Prøv igjen når du har dekning.</p>' +
    '<p style="color:#98a1ac">No connection – please try again when you are online.</p></div>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
