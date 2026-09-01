
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

const SW_VERSION = 'v1.0.1'; // Update this to bust cache

if (workbox) {
    console.log(`Workbox is loaded (Version: ${SW_VERSION})`);

    // Disable logging in production
    const isLocalhost = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
    workbox.setConfig({ debug: isLocalhost });

    const { strategies, routing, backgroundSync, expiration, cacheableResponse } = workbox;

    // 1. PROJECT HUB & EXPLORER CACHING (Offline Read)
    // Cache the list of projects, details, explorer feed, and trending
    routing.registerRoute(
        ({ url }) =>
            url.pathname.startsWith('/api/projects') ||
            url.pathname.startsWith('/api/explorer') ||
            url.pathname.startsWith('/api/trending-hashtags'),
        new strategies.StaleWhileRevalidate({
            cacheName: 'api-content-cache', // Consolidated cache
            plugins: [
                new expiration.ExpirationPlugin({
                    maxEntries: 100,
                    maxAgeSeconds: 24 * 60 * 60, // 24 hours
                }),
                new cacheableResponse.CacheableResponsePlugin({
                    statuses: [0, 200],
                }),
            ],
        })
    );

    // 2. BACKGROUND SYNC (Offline Mutations)
    // Queue failed POST/PUT/DELETE requests and retry when online
    const bgSyncPlugin = new backgroundSync.BackgroundSyncPlugin('background-sync-queue', {
        maxRetentionTime: 24 * 60, // Retry for max of 24 Hours
    });

    const matchMutation = ({ url, request }) => {
        const isApi = url.pathname.startsWith('/api/');
        const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method);
        return isApi && isMutation;
    };

    routing.registerRoute(
        matchMutation,
        new strategies.NetworkOnly({
            plugins: [bgSyncPlugin],
        }),
        'POST'
    );
    // Register for other methods handled by matchMutation
    routing.registerRoute(matchMutation, new strategies.NetworkOnly({ plugins: [bgSyncPlugin] }), 'PUT');
    routing.registerRoute(matchMutation, new strategies.NetworkOnly({ plugins: [bgSyncPlugin] }), 'DELETE');
    routing.registerRoute(matchMutation, new strategies.NetworkOnly({ plugins: [bgSyncPlugin] }), 'PATCH');


    // 3. ASSETS (Images, Fonts)
    // CacheFirst
    routing.registerRoute(
        ({ request }) => request.destination === 'image' || request.destination === 'font',
        new strategies.CacheFirst({
            cacheName: 'assets-cache',
            plugins: [
                new expiration.ExpirationPlugin({
                    maxEntries: 100,
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
                    purgeOnQuotaError: true,
                }),
            ],
        })
    );

    // 4. NEXT.JS STATIC ASSETS (Runtime)
    // Cache JS/CSS chunks visited by user
    routing.registerRoute(
        ({ url }) => url.pathname.startsWith('/_next/static/'),
        new strategies.StaleWhileRevalidate({
            cacheName: 'static-resources',
            plugins: [
                new expiration.ExpirationPlugin({
                    maxEntries: 50,
                    maxAgeSeconds: 24 * 60 * 60, // 24 hours
                }),
            ]
        })
    );

    // Skip waiting to activate new SW immediately
    self.addEventListener('install', () => self.skipWaiting());
    self.addEventListener('activate', (event) => {
        // Claim clients immediately
        event.waitUntil(self.clients.claim());

        // Optional: Cleanup old caches if version changed (manual management)
        // Here we just rely on workbox expiration, but full versioning would typically 
        // involve deleting caches not matching current version prefix.
    });

} else {
    console.log(`Workbox didn't load`);
}
