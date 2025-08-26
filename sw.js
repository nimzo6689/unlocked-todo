async function cacheFirstWithRefresh(request) {
  const fetchResponsePromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse.ok) {
      const cache = await caches.open("shokubun-todo");
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  return (await caches.match(request)) || (await fetchResponsePromise);
}

self.addEventListener("fetch", (event) => {
  event.respondWith(cacheFirstWithRefresh(event.request));
});

self.addEventListener("install", (event) => {
  console.log("Service Worker installed.");
  self.skipWaiting();
});

// 通知がクリックされたときのイベント
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked.");

  event.notification.close();

  // アプリのウィンドウにフォーカスを当てる
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // ウィンドウがなければ新しく開く
        if (!clientList.length) {
          return clients.openWindow("/");
        }

        // 既存のウィンドウがあればそれにフォーカスする
        const client = clientList.find((c) => c.focused) || clientList[0];
        return client.focus();
      })
  );
});
