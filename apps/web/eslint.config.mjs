import { createConfig } from "@desiconnect/config/eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  ...createConfig({ browser: true, ignores: ["next-env.d.ts"] }),
  {
    plugins: { "react-hooks": reactHooks },
    rules: { "react-hooks/rules-of-hooks": "error", "react-hooks/exhaustive-deps": "warn" },
  },
];
