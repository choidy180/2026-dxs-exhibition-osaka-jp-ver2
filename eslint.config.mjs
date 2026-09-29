import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-exhibition/**",
    ".next-exhibition-build/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Bundled upstream decoder required for offline GLB rendering.
    "public/draco/**",
  ]),
]);

export default eslintConfig;
