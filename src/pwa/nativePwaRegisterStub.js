// Android-native replacement for vite-plugin-pwa's virtual React module.
// Capacitor does not use a Service Worker to update the bundled application.
export function useRegisterSW() {
  const noopSetter = () => {};
  return {
    offlineReady: [false, noopSetter],
    needRefresh: [false, noopSetter],
    updateServiceWorker: async () => {},
  };
}
