// Shared ESLint flat config for all TypeScript workspaces.
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @param {{ node?: boolean; browser?: boolean; ignores?: string[] }} [options] */
export function createConfig(options = {}) {
  return tseslint.config(
    { ignores: ["dist/**", ".next/**", "node_modules/**", "coverage/**", ...(options.ignores ?? [])] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      languageOptions: {
        globals: {
          ...(options.node !== false ? globals.node : {}),
          ...(options.browser ? globals.browser : {}),
        },
      },
      rules: {
        "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
        "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
        "no-console": ["warn", { allow: ["warn", "error"] }],
      },
    },
  );
}

export default createConfig();
