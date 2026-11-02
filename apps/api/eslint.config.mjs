import { createConfig } from "@desiconnect/config/eslint";

export default [
  ...createConfig(),
  {
    rules: {
      // Nest injects classes by runtime metadata, so type-only imports would break DI.
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
];
