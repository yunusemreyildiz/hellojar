// Only job: receive jars shared to the installed app ("Share → hellojar" on
// Android, manifest share_target). The file is parked in Cache Storage and the
// library page picks it up from ?shared=1. Everything else goes to the network.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'POST' || !url.pathname.endsWith('/share-target')) return;

    event.respondWith((async () => {
        const base = url.pathname.replace(/share-target$/, '');
        try {
            const form = await event.request.formData();
            const file = form.getAll('game').find(f => f && typeof f !== 'string');
            if (file) {
                const cache = await caches.open('tuslu-share');
                await cache.put('shared-file', new Response(file, {
                    headers: { 'X-File-Name': encodeURIComponent(file.name || 'oyun.jar') },
                }));
            }
        } catch (e) {
            // fall through to the library either way
        }
        return Response.redirect(base + '?shared=1', 303);
    })());
});
