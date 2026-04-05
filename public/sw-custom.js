self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const fallbackUrl = new URL('./#/?filter=unlocked', self.registration.scope).href;
  const targetUrl = event.notification?.data?.url || fallbackUrl;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          const client = clientList[0];
          return client.navigate(targetUrl).then(() => client.focus());
        }

        return self.clients.openWindow(targetUrl);
      })
  );
});
