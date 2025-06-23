import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Convert all unused variable errors to warnings for build
      "@typescript-eslint/no-unused-vars": "warn",
      // Allow any types (converted to warning)
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow prefer-const warnings
      "prefer-const": "warn",
      // Allow unescaped entities in JSX
      "react/no-unescaped-entities": "warn",
      // Allow missing dependencies in useEffect
      "react-hooks/exhaustive-deps": "warn",
      // Allow unused imports
      "@typescript-eslint/no-unused-imports": "off",
      // Allow empty interfaces
      "@typescript-eslint/no-empty-object-type": "warn"
    }
  }
];

export default eslintConfig;
