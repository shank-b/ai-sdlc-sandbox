import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  ...coreWebVitals,
  ...typescript,
  { settings: { next: { rootDir: "apps/web" } } },
  { ignores: ["**/.next/**", "**/.next-*/**", "**/standalone/**", "node_modules/**", "playwright-report/**", "test-results/**"] },
];

export default config;
