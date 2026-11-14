import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  { ignores: [".next/**", "node_modules/**", "prisma/data/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Texte en français : les apostrophes droites (d'identité, n'existe…) sont voulues.
  { rules: { "react/no-unescaped-entities": "off" } },
];
