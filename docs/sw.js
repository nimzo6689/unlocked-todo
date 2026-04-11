if (!self.define) {
  let e,
    s = {};
  const i = (i, r) => (
    (i = new URL(i + '.js', r).href),
    s[i] ||
      new Promise(s => {
        if ('document' in self) {
          const e = document.createElement('script');
          ((e.src = i), (e.onload = s), document.head.appendChild(e));
        } else ((e = i), importScripts(i), s());
      }).then(() => {
        let e = s[i];
        if (!e) throw new Error(`Module ${i} didn’t register its module`);
        return e;
      })
  );
  self.define = (r, n) => {
    const t = e || ('document' in self ? document.currentScript.src : '') || location.href;
    if (s[t]) return;
    let o = {};
    const f = e => i(e, t),
      c = { module: { uri: t }, exports: o, require: f };
    s[t] = Promise.all(r.map(e => c[e] || f(e))).then(e => (n(...e), o));
  };
}
define(['./workbox-3e8df8c8'], function (e) {
  'use strict';
  (importScripts('sw-custom.js'),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: 'assets/index-C5fC2FwO.js', revision: null },
        { url: 'assets/index-D82X6mjz.css', revision: null },
        { url: 'favicon.ico', revision: '0ab01f9a9fea893f15b16d567a205f6e' },
        { url: 'index.html', revision: '2ff9fb40d6bb6c22a0601fd119fd2384' },
        { url: 'registerSW.js', revision: '7fffa8002fbb17e3441a710d982053cd' },
        { url: 'sw-custom.js', revision: '572f97b34b3f9b19d215b9a3f3ecd62c' },
        { url: 'manifest.webmanifest', revision: '314a86b90e29cb2c037b6ebcd7267e3d' },
      ],
      {},
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL('index.html'))));
});
