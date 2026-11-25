// GCC Admin's service worker. It makes the app installable, keeps the app
// shell (scripts, styles, fonts, icons) cached, and keeps a copy of each
// attendance sheet opened, so ushers can keep marking with no signal: the
// marks themselves queue on the device (src/lib/attendance/outbox.ts) and
// sync when the connection is back.
//
// Pages go to the network first, so nothing stale shows while online.
const CACHE = 'gcc-shell-v1'
const PAGES = 'gcc-pages-v2'
const KEEP = [CACHE, PAGES]

const OFFLINE_PAGE = `<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Offline · GCC Admin</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a0a;color:#fafafa;font-family:system-ui,sans-serif;text-align:center;padding:24px">
<div><p style="font-size:20px;font-weight:600;margin:0 0 8px">You’re offline</p>
<p style="margin:0;color:#a3a3a3">This page needs a connection. Attendance sheets you opened before still work offline.</p>
<button onclick="location.reload()" style="margin-top:20px;height:44px;padding:0 20px;border:0;background:#e8b54d;color:#2a1c05;font-weight:600;font-size:15px">Try again</button></div>`

// Pages kept for offline use: the attendance list and each sheet, and
// More (where Attendance sits on phones).
const keepPage = (url) =>
  url.pathname.startsWith('/attendance') || url.pathname === '/more'

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && keepPage(url)) {
            const copy = response.clone()
            caches.open(PAGES).then((cache) => cache.put(url.pathname, copy))
          }
          return response
        })
        .catch(async () => {
          const kept = await caches.match(url.pathname, { cacheName: PAGES })
          return (
            kept ||
            new Response(OFFLINE_PAGE, {
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
          )
        }),
    )
    return
  }

  const shellFile =
    url.pathname.startsWith('/assets/') ||
    /\.(png|svg|ico|woff2?)$/.test(url.pathname)
  if (!shellFile) return

  event.respondWith(
    caches.match(request, { ignoreVary: true }).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})
