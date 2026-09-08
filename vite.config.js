import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const velvetVersion = pkg.version;
const velvetRelease = "Human Cognition Pipeline + Direct Answer Lock";
const velvetBuildTime = new Date().toISOString();

export default defineConfig(({ mode }) => {
  const androidBuild = mode === "android";

  return {
    define: {
      __VELVET_VERSION__: JSON.stringify(velvetVersion),
      __VELVET_RELEASE__: JSON.stringify(velvetRelease),
      __VELVET_BUILD_TIME__: JSON.stringify(velvetBuildTime),
      __VELVET_ANDROID_BUILD__: JSON.stringify(androidBuild),
    },
    resolve: androidBuild
      ? { alias: { "virtual:pwa-register/react": fileURLToPath(new URL("./src/pwa/nativePwaRegisterStub.js", import.meta.url)) } }
      : undefined,
    plugins: [
      {
        name: "velvet-build-metadata",
        transformIndexHtml(html) {
          return html
            .replace(
              /<meta name="velvet-version" content="[^"]*" \/>/,
              `<meta name="velvet-version" content="${velvetVersion}" />`
            )
            .replace(
              /<meta name="velvet-runtime" content="[^"]*" \/>/,
              `<meta name="velvet-runtime" content="${androidBuild ? "android" : "web"}" />`
            );
        },
        generateBundle() {
          this.emitFile({
            type: "asset",
            fileName: "velvet-version.json",
            source: JSON.stringify(
              { version: velvetVersion, release: velvetRelease, build: velvetBuildTime },
              null,
              2
            ),
          });
        },
      },
      react(),
      !androidBuild && VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        includeAssets: [
          "velvet-vs-v4-favicon.png",
          "velvet-vs-v4-apple-180.png",
          "velvet-vs-v4-64.png",
          "velvet-vs-v4-192.png",
          "velvet-vs-v4-512.png",
          "velvet-vs-v4-maskable-512.png",
        ],
        manifest: {
          id: "/",
          name: "Velvet Stories",
          short_name: "Velvet",
          description: "Private worlds and endless stories with AI characters.",
          lang: "en",
          start_url: "/",
          scope: "/",
          display: "standalone",
          display_override: ["window-controls-overlay", "standalone"],
          prefer_related_applications: false,
          orientation: "portrait-primary",
          background_color: "#f8f3ea",
          theme_color: "#722640",
          categories: ["entertainment", "lifestyle"],
          shortcuts: [
            {
              name: "Open stories",
              short_name: "Stories",
              url: "/?open=chats",
              icons: [{ src: "velvet-vs-v4-192.png", sizes: "192x192", type: "image/png" }],
            },
          ],
          icons: [
            { src: "velvet-vs-v4-64.png", sizes: "64x64", type: "image/png", purpose: "any" },
            { src: "velvet-vs-v4-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "velvet-vs-v4-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "velvet-vs-v4-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          // Keep a little headroom for cinematic launch artwork while the source image stays optimized.
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: "/index.html",
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2,mp3}"],
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) =>
                request.destination === "image" && !url.pathname.includes("velvet-vs-v4-") && !url.pathname.includes("velvet-loading-entry"),
              handler: "CacheFirst",
              options: {
                cacheName: "velvet-images",
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ request }) => request.destination === "font",
              handler: "CacheFirst",
              options: {
                cacheName: "velvet-fonts",
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
        devOptions: { enabled: false },
      }),
    ].filter(Boolean),
  };
});
