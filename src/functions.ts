import { cancel, isCancel, log, outro } from "@clack/prompts";
import path from "node:path";
import { red } from "picocolors";
import fs from "node:fs";
import {
  Package,
  DependencyOverrides,
  SpinnerObject,
  OptionDependency,
  Dependencies,
  DefaultDependencies,
} from "./types";
import {
  DEFAULT_DEPENDENCIES,
  LATEST_DEPENDENCY_VERSIONS,
} from "./dependencies";
import { configureESLint } from "./configureESLint";

export async function prompt<T, R>(
  func: (options: T) => Promise<R>,
  options: T
) {
  const result = await func(options);
  if (isCancel(result)) {
    cancel("Operation cancelled");
    return process.exit(0);
  }
  return result as Awaited<Exclude<R, symbol>>;
}

export interface PathAndName {
  path: string;
  name: string;
}

export function formatTargetDir(targetDir: string) {
  targetDir = path.resolve(targetDir);
  return targetDir.trim().replace(/\/+$/g, "");
}

export function getPathAndNameFromTargetDir(targetDir: string): PathAndName {
  if (!targetDir) {
    return { path: "", name: "" };
  }

  const normalized = path.normalize(targetDir);
  const parts = normalized.split(path.sep).filter(Boolean);

  if (parts.length <= 1) {
    return { path: `.${path.sep}${parts[0]}`, name: parts[0] };
  }

  return { path: normalized, name: parts.at(-1) ?? "" };
}

export function isValidPackageName(projectName: string) {
  return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(
    projectName
  );
}

export function logError(msg: string) {
  console.log(red(msg));
}

export function isDir(path: string): boolean {
  try {
    const stats = fs.statSync(path);
    return stats.isDirectory();
  } catch (error) {
    log.error(red((error as Error).message));
    outro(red("Error reading path - operation stopped."));
  }
  process.exit(1);
}

export function isEmpty(path: string) {
  const files = fs.readdirSync(path);
  return files.length === 0 || (files.length === 1 && files[0] === ".git");
}

export function emptyDir(dir: string) {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const file of fs.readdirSync(dir)) {
    if (file === ".git") {
      continue;
    }
    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true });
  }
}

export function createDir(dir: string, s: SpinnerObject) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (error) {
    s.stop(red((error as Error).message), 1);
    outro(red("Operation stopped - Failed to create directory."));
    process.exit(1);
  }
}

function copyDir(srcDir: string, destDir: string) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file);
    const destFile = path.resolve(destDir, file);
    copy(srcFile, destFile);
  }
}

function copy(src: string, dest: string) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    copyDir(src, dest);
  } else {
    fs.copyFileSync(src, dest);
  }
}

const renameFiles: Record<string, string | undefined> = {
  _gitignore: ".gitignore",
};

const write = (
  targetDir: string,
  templateDir: string,
  file: string,
  content?: string
) => {
  const targetPath = path.join(targetDir, renameFiles[file] ?? file);
  if (content) {
    fs.writeFileSync(targetPath, content);
  } else {
    copy(path.join(templateDir, file), targetPath);
  }
};

export function copyTemplate(
  templateDir: string,
  targetDir: string,
  s: SpinnerObject
) {
  try {
    const files = fs.readdirSync(templateDir);
    for (const file of files) {
      if (!file.endsWith(".hbs")) {
        write(targetDir, templateDir, file);
      }
    }
  } catch (error) {
    s.stop(red((error as Error).message), 1);
    outro(red("Operation stopped - Failed to copy template files."));
    process.exit(1);
  }
}

function getDependencies(
  options: string[],
  dependencyOverrides: DependencyOverrides | undefined
) {
  const depOverridesAlways: [string, string][] = [];
  const depOverridesByOption: [string, [string, string][]][] = [];
  const devDepOverridesAlways: [string, string][] = [];
  const devDepOverridesByOption: [string, [string, string][]][] = [];

  function parseOverrideNamesAndVersions(
    item: (OptionDependency | Package) | Package[],
    alwaysArr: [string, string][],
    byOptionArr?: [string, [string, string][]][]
  ): void {
    if (typeof item === "string") {
      alwaysArr.push([item, ""]);
    } else if ("package" in item) {
      alwaysArr.push(
        item.version ? [item.package, item.version] : [item.package, ""]
      );
    } else if ("option" in item && Array.isArray(item.packages)) {
      const innerAlwaysArr: [string, string][] = [];
      item.packages.forEach((p) =>
        parseOverrideNamesAndVersions(p, innerAlwaysArr)
      );
      if (item.option && byOptionArr) {
        byOptionArr.push([item.option, innerAlwaysArr]);
      }
    }
  }

  if (dependencyOverrides?.dependencies) {
    dependencyOverrides.dependencies.forEach((dep) =>
      parseOverrideNamesAndVersions(
        dep,
        depOverridesAlways,
        depOverridesByOption
      )
    );
  }
  if (dependencyOverrides?.devDependencies) {
    dependencyOverrides.devDependencies.forEach((dep) =>
      parseOverrideNamesAndVersions(
        dep,
        devDepOverridesAlways,
        devDepOverridesByOption
      )
    );
  }

  // collect default dependencies
  const depsWithDefaults: [string, string][] = [];
  const devDepsWithDefaults: [string, string][] = [];

  function pushAsTuple(source: string[], target: [string, string][]) {
    const tuples: [string, string][] = source.map((d) => [d, ""]);
    target.push(...tuples);
  }

  function collectDeps(source: Record<string, DefaultDependencies>) {
    options.forEach((option) => {
      if (option in source) {
        if (source[option].dependencies) {
          pushAsTuple(source[option].dependencies, depsWithDefaults);
        }
        if (source[option].devDependencies) {
          pushAsTuple(source[option].devDependencies, devDepsWithDefaults);
        }
        if (source[option].withOption) {
          collectDeps(source[option].withOption);
        }
      }
    });
  }

  collectDeps(DEFAULT_DEPENDENCIES);

  // apply dependency overrides
  function applyOverride(
    overrides: [string, string][],
    target: [string, string][]
  ) {
    overrides.forEach((override) => {
      const targetIndex = target.findIndex((pkg) => pkg[0] === override[0]);
      if (targetIndex !== -1) {
        target[targetIndex] = override;
      } else {
        target.push(override);
      }
    });
  }

  options.forEach((option) => {
    const depOverrideIndex = depOverridesByOption.findIndex(
      (o) => o[0] === option
    );
    if (depOverrideIndex !== -1) {
      applyOverride(
        depOverridesByOption[depOverrideIndex][1],
        depsWithDefaults
      );
    }

    const devDepOverrideIndex = depOverridesByOption.findIndex(
      (o) => o[0] === option
    );
    if (devDepOverrideIndex !== -1) {
      applyOverride(
        devDepOverridesByOption[devDepOverrideIndex][1],
        depsWithDefaults
      );
    }
  });

  // fill versions from defaults where missing
  depsWithDefaults.forEach((d, index) => {
    if (!d[1]) {
      depsWithDefaults[index][1] = LATEST_DEPENDENCY_VERSIONS[d[0]];
    }
  });
  devDepsWithDefaults.forEach((d, index) => {
    if (!d[1]) {
      devDepsWithDefaults[index][1] = LATEST_DEPENDENCY_VERSIONS[d[0]];
    }
  });

  return {
    dependencies: Object.fromEntries(depsWithDefaults),
    devDependencies: Object.fromEntries(devDepsWithDefaults),
  };
}

function configureOptions(
  targetDirPath: string,
  templateDirPath: string,
  options: string[],
  dependencies: Dependencies,
  s: SpinnerObject
) {
  for (const option of options) {
    if (option === "eslint") {
      configureESLint(targetDirPath, templateDirPath, dependencies, s);
    } else if (option === "prettier") {
      s.stop(`Configuration for ${option} is not yet implemented.`, 1);
    } else if (option === "editorconfig") {
      s.stop(`Configuration for ${option} is not yet implemented.`, 1);
    } else if (option === "githooks") {
      s.stop(`Configuration for ${option} is not yet implemented.`, 1);
    } else if (option === "husky") {
      s.stop(`Configuration for ${option} is not yet implemented.`, 1);
    } else if (option === "githubActions") {
      s.stop(`Configuration for ${option} is not yet implemented.`, 1);
    } else if (option === "releasePlease") {
      s.stop(`Configuration for ${option} is not yet implemented.`, 1);
    }
  }
}

function sortObjectKeys<T extends Record<string, string>>(
  obj: T
): Record<string, string> {
  const sortedKeys = Object.keys(obj).sort((a, b) => {
    const aIsAt = a.startsWith("@");
    const bIsAt = b.startsWith("@");

    if (aIsAt && !bIsAt) return -1;
    if (!aIsAt && bIsAt) return 1;
    return a.localeCompare(b);
  });

  const result: Record<string, string> = {};
  for (const key of sortedKeys) {
    result[key] = obj[key];
  }

  return result;
}

export function updateCreatedProject(
  targetDirPath: string,
  templateDirPath: string,
  projectName: string,
  options: string[],
  projectDependencyOverrides: DependencyOverrides | undefined,
  packageManager: string,
  installDeps: boolean,
  s: SpinnerObject
) {
  // read template package.json from the target directory
  const packageJsonPath = path.join(targetDirPath, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    s.stop(
      red(
        `Error: Could not find package.json from the target directory "${targetDirPath}".`
      ),
      1
    );
    outro(red("Operation stopped - Failed to copy template files."));
    process.exit(1);
  }
  const packageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, "utf-8")
  ) as Record<string, unknown>;

  // update package.json with project name and dependencies
  packageJson.name = projectName;
  const dependencies = getDependencies(options, projectDependencyOverrides);
  if (
    dependencies.dependencies &&
    Object.keys(dependencies.dependencies).length > 0
  ) {
    packageJson.dependencies = sortObjectKeys(
      (packageJson.dependencies = Object.assign(
        (packageJson.dependencies as Record<string, string>) ?? {},
        dependencies.dependencies
      ))
    );
  }
  if (
    dependencies.devDependencies &&
    Object.keys(dependencies.devDependencies).length > 0
  ) {
    packageJson.devDependencies = sortObjectKeys(
      (packageJson.devDependencies = Object.assign(
        (packageJson.devDependencies as Record<string, string>) ?? {},
        dependencies.devDependencies
      ))
    );
  }

  // write modified package.json to the target directory
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + "\n",
    "utf-8"
  );

  // configure optional tools
  configureOptions(targetDirPath, templateDirPath, options, dependencies, s);

  // install dependencies if requested
}
