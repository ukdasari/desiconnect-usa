import { createConfig } from "@desiconnect/config/eslint";

export default [
  ...createConfig(),
  { files: ["prisma/seed/**"], rules: { "no-console": "off" } },
];
