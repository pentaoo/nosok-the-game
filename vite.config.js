import { defineConfig } from "vite";

const FALLBACK_REPO_NAME = "nosok-the-game";
const repositoryName =
  process.env.GITHUB_REPOSITORY?.split("/")[1] ?? FALLBACK_REPO_NAME;

export default defineConfig({
  base: `/${repositoryName}/`,
});
