import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

import react from "@vitejs/plugin-react";

import { getPackageVersions } from "./scripts/package-metadata.mjs";

const versions = getPackageVersions();

function normalizeModuleId(id: string, root: string): string {
  const normalized = id.replaceAll("\\", "/");
  const normalizedRoot = root.replaceAll("\\", "/").replace(/\/$/, "");
  return normalized.startsWith(`${normalizedRoot}/`)
    ? normalized.slice(normalizedRoot.length + 1)
    : normalized;
}

function bundleGraphPlugin(fileName: string): Plugin {
  let root = "";
  return {
    name: `wikitext-fmt-${fileName}`,
    configResolved(config) {
      root = config.root;
    },
    generateBundle(_options, bundle) {
      const chunks = [];
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") continue;
        chunks.push({
          file: output.fileName,
          name: output.name,
          isEntry: output.isEntry,
          isDynamicEntry: output.isDynamicEntry,
          facadeModuleId: output.facadeModuleId
            ? normalizeModuleId(output.facadeModuleId, root)
            : null,
          imports: output.imports,
          dynamicImports: output.dynamicImports,
          modules: Object.keys(output.modules).map((id) =>
            normalizeModuleId(id, root),
          ),
        });
      }
      // Vite also applies top-level Rollup plugins while bundling a Worker.
      // Only let the application graph plugin emit from the HTML entry build.
      if (
        fileName === "app-bundle-graph.json" &&
        !chunks.some((chunk) => chunk.name === "index")
      ) {
        return;
      }
      this.emitFile({
        type: "asset",
        fileName,
        source: JSON.stringify({ chunks }, null, 2),
      });
    },
  };
}

function buildMetadataPlugin(): Plugin {
  return {
    name: "wikitext-fmt-build-metadata",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "build-metadata.json",
        source: JSON.stringify(versions, null, 2),
      });
    },
  };
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "/",
  define: {
    __WIKITEXT_FMT_VERSION__: JSON.stringify(versions.formatterVersion),
    __WIKITEXT_FMT_WEB_VERSION__: JSON.stringify(versions.webVersion),
  },
  plugins: [react(), buildMetadataPlugin()],
  build: {
    target: "es2022",
    manifest: true,
    rollupOptions: {
      plugins: [bundleGraphPlugin("app-bundle-graph.json")],
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  worker: {
    format: "es",
    plugins: () => [bundleGraphPlugin("formatter-worker-graph.json")],
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
      },
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    restoreMocks: true,
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
