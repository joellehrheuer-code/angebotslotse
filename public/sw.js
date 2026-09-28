const CACHE = "angebotslotse-shell-v2";
const scope = self.registration.scope;
const local = path => new URL(path, scope).href;
const SHELL = [
  local("./"),
  local("site.css"),
  local("app.js"),
  local("favicon.svg"),
  local("offline.html")
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/konto.html") || url.pathname.endsWith("/alerts-feed.json")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) || caches.match(local("offline.html")))
    );
    return;
  }

  if (["style","script","image","font"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(cached => {
        const network = fetch(request).then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});


self.addEventListener("push", event => {
  let payload = {};
  try { payload = event.data?.json?.() || {}; } catch {
    payload = { body: event.data?.text?.() || "" };
  }
  const title = String(payload.title || "Angebotslotse");
  const target = new URL(String(payload.url || "konto.html"), scope).href;
  const options = {
    body: String(payload.body || "Es gibt eine neue Meldung zu deinen Angeboten."),
    icon: local("favicon.svg"),
    badge: local("favicon.svg"),
    tag: String(payload.tag || "angebotslotse-alert"),
    renotify: false,
    data: { url: target }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification?.data?.url || local("konto.html");
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(async windows => {
      for (const client of windows) {
        try {
          if ("navigate" in client) await client.navigate(target);
          return client.focus();
        } catch {}
      }
      return clients.openWindow(target);
    })
  );
});
