const recoveryKey = "invexa-stale-client-recovery";

if (!window.sessionStorage.getItem(recoveryKey)) {
  window.sessionStorage.setItem(recoveryKey, "1");

  const removeOldWorker = "serviceWorker" in navigator
    ? navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(
          registrations
            .filter((registration) => registration.active?.scriptURL.includes("/dev-sw.js"))
            .map((registration) => registration.unregister()),
        ),
      )
    : Promise.resolve();

  const clearOldCaches = "caches" in window
    ? window.caches.keys().then((keys) => Promise.all(keys.map((key) => window.caches.delete(key))))
    : Promise.resolve();

  Promise.allSettled([removeOldWorker, clearOldCaches]).finally(() => {
    window.location.replace(`/?recovered=${Date.now()}`);
  });
}
