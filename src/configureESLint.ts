import fs from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";
import { Dependencies, SpinnerObject } from "./types";

function getImports(dependencies: Dependencies, s: SpinnerObject) {
  if (dependencies?.devDependencies) {
    return Object.keys(dependencies?.devDependencies).map((dep) => {
      console.log(dep);
      if (dep === "eslint") {
        return {
          default: "eslintConfigPrettier",
          source: "eslint-config-prettier",
        };
      } else if (dep === "prettier") {
        return {
          default: "eslintConfigPrettier",
          source: "eslint-config-prettier",
        };
      } else if (dep === "editorconfig") {
        s.stop(`Configuration for ${dep} is not yet implemented.`, 1);
      } else if (dep === "githooks") {
        s.stop(`Configuration for ${dep} is not yet implemented.`, 1);
      } else if (dep === "husky") {
        s.stop(`Configuration for ${dep} is not yet implemented.`, 1);
      } else if (dep === "githubActions") {
        s.stop(`Configuration for ${dep} is not yet implemented.`, 1);
      } else if (dep === "releasePlease") {
        s.stop(`Configuration for ${dep} is not yet implemented.`, 1);
      }
    });
  }
  return [];
}

export function configureESLint(
  targetDirPath: string,
  templateDirPath: string,
  dependencies: Dependencies,
  s: SpinnerObject
) {
  Handlebars.registerHelper("join", function (arr: string[], sep: string) {
    return arr.join(sep);
  });

  const imports = getImports(dependencies, s);

  // Sample config data
  const configData = {
    imports: [
      { default: "React", named: ["useState", "useEffect"], source: "react" },
      { named: ["readFileSync"], source: "fs" },
      { default: "path", source: "path" },
    ],
  };

  // Load template
  const templatePath = path.resolve(templateDirPath, "eslint.config.hbs");
  const templateContent = fs.readFileSync(templatePath, "utf-8");

  // Compile and render
  const template = Handlebars.compile(templateContent);
  const output = template(configData);

  // Write to file
  const outputPath = path.resolve(targetDirPath, "eslint.config.js");
  fs.writeFileSync(outputPath, output);
}
