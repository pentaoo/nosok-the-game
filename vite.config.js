import { defineConfig } from "vite";

const FALLBACK_REPO_NAME = "nosok-the-game";
const repositoryName =
  process.env.GITHUB_REPOSITORY?.split("/")[1] ?? FALLBACK_REPO_NAME;

export default defineConfig({
  base: `/${repositoryName}/`,
  build: {
    chunkSizeWarningLimit: 620,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("three/examples/jsm")) return "three-examples";
          if (id.includes("/three/")) return "three-core";
          return "vendor";
        },
      },
    },
  },
});
