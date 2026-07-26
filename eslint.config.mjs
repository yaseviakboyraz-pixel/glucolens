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
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated native payloads: `npx cap copy` mirrors the built out/ bundle
    // into the iOS and Android projects. Linting those minified chunks buried
    // the ~30 real src/ findings under thousands of meaningless ones.
    "ios/App/App/public/**",
    "android/app/src/main/assets/public/**",
  ]),
]);

export default eslintConfig;
