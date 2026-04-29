import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: [
      "node_modules/**",
      "**/dist/**",
      "**/build/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        Buffer: "readonly",
        console: "readonly",
        document: "readonly",
        NodeJS: "readonly",
        process: "readonly",
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "no-console": "off",
      // Both the base and TS-aware `no-redeclare` rules misfire on the
      // idiomatic zod pattern:
      //   export const X = z.something();
      //   export type X = z.infer<typeof X>;
      // The value (const X) and type (type X) live in different declaration
      // namespaces in TypeScript, so this is not actually a redeclaration —
      // but the lint rules don't model that distinction. TS itself catches
      // real redeclarations via its own diagnostics, so disabling these
      // rules is safe.
      "no-redeclare": "off",
      "@typescript-eslint/no-redeclare": "off",
      // Allow underscore-prefixed args/vars to be intentionally unused (e.g.
      // generic-only parameters whose runtime value is irrelevant).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Vercel Edge runtime globals. packages/gate runs as edge middleware on
    // Vercel — Web standards only (no Node APIs). It also gets imported by
    // the per-app middleware.ts at each frontend project root.
    files: [
      "packages/gate/**/*.ts",
      "apps/app/middleware.ts",
      "apps/patient/middleware.ts",
      "apps/directory/middleware.ts",
    ],
    languageOptions: {
      globals: {
        setTimeout: "readonly",
        clearTimeout: "readonly",
        crypto: "readonly",
        Request: "readonly",
        Response: "readonly",
        URL: "readonly",
        TextEncoder: "readonly",
        CryptoKey: "readonly",
      },
    },
  },
  {
    // Browser globals for frontend app code. The base config above only loads
    // a small Node-shaped set; adding the browser surface here keeps app code
    // honest without polluting the API/workers globals (where, e.g., a stray
    // `localStorage` reference should be a hard error).
    files: ["apps/app/**/*.{ts,tsx}", "apps/patient/**/*.{ts,tsx}", "apps/directory/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        navigator: "readonly",
        location: "readonly",
        fetch: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        HTMLElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLFormElement: "readonly",
        HTMLMetaElement: "readonly",
        HTMLLinkElement: "readonly",
        HTMLScriptElement: "readonly",
        Element: "readonly",
        Event: "readonly",
        FormData: "readonly",
        crypto: "readonly",
      },
    },
  },
  {
    // PHI-bearing runtime code paths must use the structured pino logger
    // (apps/api/src/logger.ts, apps/workers/src/logger.ts), never console.*.
    // redactPhi is a last-line defense; the field-based pino API is the
    // primary control. Console calls are easy to write a stack trace into
    // by accident, which then evades redactPhi pattern matching for names,
    // MRNs, addresses, etc.
    files: ["apps/api/src/**/*.{ts,tsx}", "apps/workers/src/**/*.{ts,tsx}"],
    rules: {
      "no-console": "error",
    },
  },
  {
    // Scripts (CLI utilities, migrations, seed) are NOT in the request path
    // and have no PHI exposure; console output is fine and helpful for
    // operators running them by hand.
    files: ["**/scripts/**/*.{ts,tsx}"],
    rules: {
      "no-console": "off",
    },
  },
  prettier,
];
