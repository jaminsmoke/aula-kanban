import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsdoc from "eslint-plugin-jsdoc";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    "dist/**",
    ".vinext/**",
    ".wrangler/**",
    ".sites-runtime/**",
    "outputs/**",
    "work/**",
    "examples/**",
  ]),
  {
    rules: {
      // `const { secret, ...rest }` is the project's way of omitting a field
      // before serializing; the omitted sibling is intentional, not unused.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      // No se usa console en el código de la app; los errores van por la UI.
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  // JSDoc estricto (recomendado para TypeScript) solo para el código de la app:
  // cada función/componente/hook exportado debe documentar qué hace, sus
  // parámetros y (si devuelve algo) su retorno. Los tests y el andamiaje del
  // starter (lib/, scripts/, worker/, examples/) quedan fuera de esta exigencia.
  {
    files: ["app/**/*.{ts,tsx}", "db/**/*.{ts,tsx}", "lib/server/**/*.{ts,tsx}"],
    ignores: ["app/**/*.test.{ts,tsx}"],
    plugins: { jsdoc },
    settings: {
      jsdoc: { mode: "typescript" },
    },
    rules: {
      ...jsdoc.configs["flat/recommended-typescript"].rules,
      // Los parámetros desestructurados (props de React) se documentan con un
      // único `@param props`; no se exige un `@param` por campo desestructurado.
      "jsdoc/check-param-names": ["error", { checkDestructured: false }],
      "jsdoc/require-param": ["error", { checkDestructuredRoots: false }],
      "jsdoc/check-tag-names": "error",
      "jsdoc/check-types": "error",
      "jsdoc/empty-tags": "error",
      "jsdoc/no-multi-asterisks": "error",
      "jsdoc/valid-types": "error",
      "jsdoc/require-description": "error",
      "jsdoc/require-hyphen-before-param-description": "error",
      "jsdoc/require-param-description": "error",
      "jsdoc/require-param-name": "error",
      "jsdoc/require-returns": "error",
      "jsdoc/require-returns-check": "error",
      "jsdoc/require-returns-description": "error",
      "jsdoc/require-jsdoc": [
        "error",
        {
          publicOnly: true,
          require: {
            FunctionDeclaration: true,
            MethodDefinition: false,
            ClassDeclaration: true,
            ArrowFunctionExpression: true,
            FunctionExpression: true,
          },
        },
      ],
    },
  },
]);

export default eslintConfig;
