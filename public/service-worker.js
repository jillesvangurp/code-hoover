/* global self, caches */

const CACHE_NAME = 'code-hoover-v2'
const CORE_ASSETS = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest']

async function addBuildAssets(cache) {
  const assets = new Set(CORE_ASSETS)

  try {
    const response = await fetch('/asset-manifest.json', { cache: 'no-store' })
    if (response.ok) {
      const manifest = await response.json()
      for (const entry of Object.values(manifest)) {
        if (entry.file) assets.add(`/${entry.file}`)
        for (const css of entry.css || []) assets.add(`/${css}`)
        for (const asset of entry.assets || []) assets.add(`/${asset}`)
      }
    }
  } catch {
    // The runtime cache below still keeps visited app assets available offline.
  }

  await cache.addAll([...assets])
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(addBuildAssets).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy))
          return response
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      })
    }),
  )
})
