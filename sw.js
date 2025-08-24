self.addEventListener("install", (event) => {
  console.log("Service Worker installed.");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activated.");
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
        if (clientList.length > 0) {
          let client = clientList[0];
          // 既存のウィンドウがあればそれにフォーカスする
          for (let i = 0; i < clientList.length; i++) {
            if (clientList[i].focused) {
              client = clientList[i];
            }
          }
          return client.focus();
        }
        // ウィンドウがなければ新しく開く
        return clients.openWindow("/");
      })
  );
});
