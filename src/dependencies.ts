import { DefaultDependencies } from "./types";

export const LATEST_DEPENDENCY_VERSIONS: Record<string, string> = {
  "@eslint/js": "^9.30.1",
  "@testing-library/jest-dom": "^6.6.3",
  "@testing-library/react": "^16.3.0",
  "@types/react": "^19.1.8",
  "@types/react-dom": "^19.1.6",
  "@vitejs/plugin-react": "^4.6.0",
  "@vitest/coverage-v8": "^3.2.4",
  eslint: "^9.30.1",
  "eslint-plugin-react-hooks": "^5.2.0",
  "eslint-plugin-react-refresh": "^0.4.20",
  globals: "^16.3.0",
  husky: "^9.1.7",
  prettier: "^3.6.2",
  react: "^19.1.0",
  "react-dom": "^19.1.0",
  stylelint: "^16.21.1",
  "stylelint-config-standard": "^38.0.0",
  typescript: "~5.8.3",
  "typescript-eslint": "^8.35.1",
  vite: "^7.0.4",
  vitest: "^3.2.4",
};

export const DEFAULT_DEPENDENCIES: Record<string, DefaultDependencies> = {
  eslint: {
    devDependencies: ["@eslint/js", "eslint", "globals", "typescript-eslint"],
    withOption: {
      react: {
        devDependencies: [
          "eslint-plugin-react-hooks",
          "eslint-plugin-react-refresh",
        ],
      },
    },
  },
  prettier: {
    devDependencies: ["prettier"],
    withOption: {
      eslint: {
        devDependencies: ["eslint-config-prettier"],
      },
    },
  },
  vitest: {
    devDependencies: ["vitest"],
    withOption: {
      eslint: {
        devDependencies: ["eslint-plugin-vitest"],
      },
    },
  },
  reactTestingLibrary: {
    devDependencies: ["@testing-library/react", "@testing-library/jest-dom"],
  },
};
