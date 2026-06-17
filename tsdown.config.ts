import { defineConfig } from "tsdown";

export default defineConfig({
  platform: "browser",
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  minify: true,
  sourcemap: true,
  treeshake: true,
  deps: {
    onlyBundle: false,
    neverBundle: ["react"],
  },
});
