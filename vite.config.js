import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
);

const velvetVersion = pkg.version;
const velvetRelease = "Emotional Aftercare";

function upsertMetaTag(html, name, content) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const metaPattern = new RegExp(
    `<meta\\s+name=["']${escapedName}["']\\s+content=["'][^"']*["']\\s*/?>`,
    "i",
  );
  const tag = `<meta name="${name}" content="${content}" />`;

  if (metaPattern.test(html)) {
    return html.replace(metaPattern, tag);
  }

  return html.replace(/<\/head>/i, `  ${tag}\n</head>`);
}

export default defineConfig(({ mode }) => {
  const androidBuild = mode === "android";
  const velvetBuildTime = new Date().toISOString();

  return {
    define: {
      __VELVET_VERSION__: JSON.stringify(velvetVersion),
      __VELVET_RELEASE__: JSON.stringify(velvetRelease),
      __VELVET_BUILD_TIME__: JSON.stringify(velvetBuildTime),
      __VELVET_ANDROID_BUILD__: JSON.stringify(androidBuild),
    },

    resolve: androidBuild
      ? {
          alias: {
            "virtual:pwa-register/react": fileURLToPath(
              new URL("./src/pwa/nativePwaRegisterStub.js", import.meta.url),
            ),
          },
        }
      : undefined,

    plugins: [
      {
        name: "velvet-build-metadata",

        transformIndexHtml(html) {
          const runtime = androidBuild ? "android" : "web";
          let transformed = upsertMetaTag(
            html,
            "velvet-version",
            velvetVersion,
          );
          transformed = upsertMetaTag(
            transformed,
            "velvet-runtime",
            runtime,
          );
          return transformed;
        },

        generateBundle() {
          this.emitFile({
            type: "asset",
            fileName: "velvet-version.json",
            source: JSON.stringify(
              {
                version: velvetVersion,
                release: velvetRelease,
                build: velvetBuildTime,
              },
              null,
              2,
            ),
          });
        },
      },

      react(),

      !androidBuild &&
        VitePWA({
          registerType: "autoUpdate",
          injectRegister: "auto",

          includeAssets: [
            "velvet-rose-no-frame-favicon.png",
            "velvet-rose-no-frame-apple-180.png",
            "velvet-rose-no-frame-64.png",
            "velvet-rose-no-frame-192.png",
            "velvet-rose-no-frame-512.png",
            "velvet-rose-no-frame-maskable-512.png",
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
                icons: [
                  {
                    src: "velvet-rose-no-frame-192.png",
                    sizes: "192x192",
                    type: "image/png",
                  },
                ],
              },
            ],

            icons: [
              {
                src: "velvet-rose-no-frame-64.png",
                sizes: "64x64",
                type: "image/png",
                purpose: "any",
              },
              {
                src: "velvet-rose-no-frame-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
              },
              {
                src: "velvet-rose-no-frame-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
              },
              {
                src: "velvet-rose-no-frame-maskable-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
              },
            ],
          },

          workbox: {
            // Keep headroom for cinematic launch artwork while source images stay optimized.
            maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
            cleanupOutdatedCaches: true,
            clientsClaim: true,
            skipWaiting: true,
            // Never precache index.html. A stale HTML shell can point at hashed
            // bundles that no longer exist after a Vercel deployment.
            navigateFallback: null,
            globPatterns: ["**/*.{js,css,ico,png,svg,webp,woff,woff2}"],

            runtimeCaching: [
              {
                // Velvet depends on live Supabase data, so a cached HTML shell is
                // more dangerous than useful. Never serve stale navigation HTML:
                // an older shell can reference hashed JS chunks removed by a newer deploy.
                urlPattern: ({ request }) => request.mode === "navigate",
                handler: "NetworkOnly",
              },
              {
                urlPattern: ({ request, url }) =>
                  request.destination === "image" &&
                  !url.pathname.includes("velvet-rose-no-frame-") &&
                  !url.pathname.includes("velvet-loading-entry"),
                handler: "CacheFirst",
                options: {
                  cacheName: "velvet-images",
                  expiration: {
                    maxEntries: 80,
                    maxAgeSeconds: 60 * 60 * 24 * 30,
                  },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
              {
                urlPattern: ({ request }) => request.destination === "font",
                handler: "CacheFirst",
                options: {
                  cacheName: "velvet-fonts",
                  expiration: {
                    maxEntries: 20,
                    maxAgeSeconds: 60 * 60 * 24 * 365,
                  },
                },
              },
            ],
          },

          devOptions: {
            enabled: false,
          },
        }),
    ].filter(Boolean),
  };
});
