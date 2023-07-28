/// <reference no-default-lib="true"/>
/// <reference lib="es2015" />
/// <reference lib="webworker" />

const cacheKey = 'v5';
console.log(`cacheKey = [${cacheKey}]`);

/** @type {ServiceWorkerGlobalScope} */
const sw = self;

sw.addEventListener('install', evt => {
  console.log('installed');
  evt.waitUntil(
    caches.open(cacheKey).then(cache => {
      return cache.addAll([
        '/',
        '/manifest.webmanifest',
        '/index.html',
        '/style.css',
        '/coscup.jpg',
      ]);
    }));
});

sw.addEventListener('fetch', evt => {
  evt.respondWith(
    caches.open(cacheKey).then(async cache => {
      const resp = await cache.match(evt.request)
      if (resp) {
        console.log(`Using cached [${evt.request.url}]`);
        return resp;
      }

      console.log(`Fetching [${evt.request.url}] from remote`);
      const remoteResp = await fetch(evt.request)
      const url = new URL(evt.request.url)
      if (url.hostname.match(/cdnjs/i))
        cache.put(evt.request, remoteResp.clone());
      return remoteResp;
    }));
});

sw.addEventListener('activate', evt => {
  console.log('activated');
  evt.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => cacheName != cacheKey)
          .map(cacheName => caches.delete(cacheName)))
    }).then(() => sw.clients.claim()));
});

sw.addEventListener('message', evt => {
  if (evt.data.action == 'purgeCache') {
    console.log(`Purging caches...`);
    caches.keys().then(cacheNames => {
      return Promise.all(cacheNames.map(cacheName => {
        console.log(`Cache [${cacheName}] deleted`);
        return caches.delete(cacheName);
      }));
    }).then(() => {
      console.log('Caches purged');
      evt.ports[0].postMessage({ok: true})
    });
  }
});
