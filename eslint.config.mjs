import drizzle from "eslint-plugin-drizzle";
import tsParser from "@typescript-eslint/parser";
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier/flat";
import tseslint from "typescript-eslint";

const config = defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextVitals,
  prettier,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],

    plugins: {
      drizzle,
    },

    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",

      parserOptions: {
        project: "./tsconfig.json",
      },
    },

    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          destructuredArrayIgnorePattern: "^_",
        },
      ],

      ...drizzle.configs.recommended.rules,
      "drizzle/enforce-delete-with-where": [
        "error",
        {
          drizzleObjectName: ["db", "tx"],
        },
      ],
    },
  },

  {
    files: ["**/*.cjs"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",

      globals: {
        // Node.js CommonJS globals
        module: "writable",
        exports: "writable",
        require: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        global: "readonly",
      },
    },

    rules: {
      // Disable TypeScript rules for .cjs files
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default config;
