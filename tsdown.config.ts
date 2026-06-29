import { defineConfig } from "tsdown";

export default defineConfig({
  platform: "browser",
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  minify: true,
  sourcemap: true,
  treeshake: true,
  entry: {
    index: "src/index.ts",
    "preact/index": "src/preact/index.ts",
  },
  deps: {
    onlyBundle: false,
    neverBundle: ["react"],
  },
});
