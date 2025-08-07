/* eslint-disable no-control-regex */
import { cancel, isCancel, log, Option, outro } from '@clack/prompts';
import path from 'node:path';
import fs from 'node:fs';
import { red } from 'picocolors';
import {
  Package,
  DependencyOverrides,
  SpinnerObject,
  OptionDependency,
  Dependencies,
  DefaultDependencies,
  TemplateConfig,
  ConfigureScriptProps,
} from '@shared/types';
import {
  DEFAULT_DEPENDENCIES,
  LATEST_DEPENDENCY_VERSIONS,
} from './dependencies';
import { configureESLint } from './configurationScripts/configureESLint';
import { configurePrettier } from './configurationScripts/configurePrettier';
import { configureEditorConfig } from './configurationScripts/configureEditorConfig';
import { copyDir, getScriptName } from '@shared/common';
import { configureReadme } from './configurationScripts/configureReadme';
import { configureHusky } from './configurationScripts/configureHusky';

const TEMPLATE_FILE_CONFIG_FILE_NAME = 'template.config.json';
const errorColor = red;

/**
 * A wrapper for clack/prompts that handles prompt cancellation in a
 * concistent manner.
 * @param func The prompt function to be used.
 * @param options Options for the prompt function.
 * @returns Result of the prompt function.
 */
export async function prompt<T, R>(
  func: (options: T) => Promise<R>,
  options: T
) {
  const result = await func(options);
  if (isCancel(result)) {
    cancel('Operation cancelled');
    return process.exit(0);
  }
  return result as Awaited<Exclude<R, symbol>>;
}

/**
 * Creates a new array of selected that is sorted to match the order of
 * choices.
 */
export function sortOptions(choices: Option<string>[], selected: string[]) {
  return choices
    .map((choice) => choice.value)
    .filter((value) => selected.includes(value));
}

function isRootDir(inputPath: string) {
  const normalized = path.resolve(inputPath);
  const { root } = path.parse(normalized);
  return normalized === root;
}

function isValidPath(filePath: string) {
  if (typeof filePath !== 'string' || filePath.length === 0) return false;

  const windowsValidation =
    /^(?!^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$)[^<>:"/\\|?*\x00-\x1F][^<>:"/\\|?*\x00-\x1F]{0,254}(?<![ .])$/;

  // although ASCII control characters and filenames ending in a space or
  // a period are allowed in POSIX, they are treated as invalid here.
  const posixValidation = /^[^\x00-\x1F/][^\x00-\x1F/]{0,254}(?<![ .])$/;

  const onWindows = process.platform === 'win32';
  const parts = filePath.split(path.sep);
  for (const part of parts) {
    if (part === '' || part === '.' || part === '..') continue;
    if (onWindows && !windowsValidation.test(part)) return false;
    if (!onWindows && !posixValidation.test(part)) return false;
    if (part.length > 255) return false;
  }

  return true;
}

/**
 * Represents the result of a path validation operation.
 * @property success - Discriminates between success (`true`) and failure
 * (`false`) cases.
 *
 * When `success` is `true`:
 * - `value` contains the validated string.
 *
 * When `success` is `false`:
 * - `error` contains a description of the validation error.
 */
type ValidationResult =
  | {
      success: true;
      /** The validated string value. */
      value: string;
    }
  | {
      success: false;
      /** Description of the validation error. */
      error: string;
    };

/**
 * Resolves the path and checks that it is not the root directory and that it
 * is a valid path.
 *
 * Notice that the validation does not allow ascii control characters in path
 * names or that they end in a period or an empty space even in POSIX.
 * @param targetDir Target directory path to resolve and validate.
 * @returns Result of the validation operation as ValidationResult.
 */
export function resolveAndValidateTargetDirPath(
  targetDirPath: string
): ValidationResult {
  if (!targetDirPath) {
    return {
      success: false,
      error: 'Target directory path cannot be an empty string.',
    };
  }
  const resolvedPath = path.resolve(targetDirPath);
  if (isRootDir(resolvedPath)) {
    return { success: false, error: 'Target directory cannot be the root.' };
  }
  if (!isValidPath(resolvedPath)) {
    return {
      success: false,
      error: `Path "${resolvedPath}" is invalid. Path names must not end in a period or an empty space.`,
    };
  }
  return { success: true, value: resolvedPath };
}

/**
 * Splits the path by path.separator characters and returns the last part to be
 * used as the project name.
 * @param pathString Path string from which the name is extracted from.
 * @returns Last part of the path (string) or an empty string.
 */
export function getProjectName(pathString: string) {
  if (!pathString) {
    return '';
  }
  const normalized = path.normalize(pathString);
  const parts = normalized.split(path.sep);
  return parts.at(-1) ?? '';
}

/**
 * Validates that the name is a valid npm package name.
 * @param projectName
 * @returns
 */
export function isValidPackageName(projectName: string) {
  return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(
    projectName
  );
}

/**
 * Outputs to console.log a message using the error color.
 * @param msg Message to output.
 */
export function logError(msg: string) {
  console.log(errorColor(msg));
}

/**
 * Tests whether the path leads to a directory.
 * @param path Path to test.
 * @returns True if the path leads to a directory and false otherwise.
 */
export function isDir(path: string): boolean {
  try {
    const stats = fs.statSync(path);
    return stats.isDirectory();
  } catch (error) {
    log.error(red((error as Error).message));
    outro(red('Error reading path - operation stopped.'));
  }
  process.exit(1);
}

/**
 * Tests whether the path leads to an empty directory.
 *
 * Notice! Expects the path to lead to a directory and throws otherwise.
 * @param path Path to test.
 * @returns True if the path leads to an empty directory, false otherwise.
 */
export function isEmpty(path: string) {
  const files = fs.readdirSync(path);
  return files.length === 0 || (files.length === 1 && files[0] === '.git');
}

/**
 * Clears the directory of all of its contents (except .git/).
 * @param dir Path to the directory as a string.
 */
export function clearDir(dir: string) {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const file of fs.readdirSync(dir)) {
    if (file === '.git') {
      continue;
    }
    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true });
  }
}

/**
 * Creates a directory to a given path.
 *
 * If the creation of the directory fails, outputs the error using stop
 * function of the given clack/prompts spinner object.
 * @param dir Path to the directory as a string.
 * @param s The clack/prompts spinner object to use for outputting error.
 */
export function createDir(dir: string, s: SpinnerObject) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (error) {
    s.stop(red((error as Error).message), 1);
    outro(red('Operation stopped - Failed to create directory.'));
    process.exit(1);
  }
}

/**
 * Copies template files from `templateDir` to `targetDir`.
 *
 * If the copying fails, outputs an error message using the given clack/prompts
 * spinner object's stop method and exits with an error code.
 * @param templateDir Path to the template directory.
 * @param targetDir Path to the target directory.
 * @param s The clack/prompts spinner object to use for outputting error.
 */
export function copyTemplate(
  templateDir: string,
  targetDir: string,
  s: SpinnerObject
) {
  try {
    copyDir(templateDir, targetDir);
  } catch (error) {
    s.stop(red((error as Error).message), 1);
    outro(red('Operation stopped - Failed to copy template files.'));
    process.exit(1);
  }
}

/**
 * Returns the project dependencies based on the selected options, template
 * dependencies and dependency overrides.
 *
 * Template dependencies are read from the package.json in the template
 * directory. Dependencies are also added based on the selected options.
 * Dependency overrides are specified in the Template object and
 * they override any dependencies read from the template package.json or from
 * the default option dependencies.
 *
 * If version numbers are left missing they are filled from the
 * LATEST_DEPENDENCY_VERSIONS object.
 *
 * The returned object contains `Record<string, string>` objects corresponding
 * to the package.json properties `dependencies`, `devDependencies` and
 * `peerDependencies`.
 * @param options Selected options.
 * @param templateDependencies Dependencies read from the package.json in the
 *    template directory.
 * @param dependencyOverrides Dependencies read from the Template object that
 *    override any dependencies from the template package.json or default
 *    option dependencies.
 * @returns An object containing `Record<string, string>` objects corresponding
 *    to the package.json properties `dependencies`, `devDependencies` and
 *    `peerDependencies`.
 */
function getDependencies(
  options: string[],
  templateDependencies: Dependencies,
  dependencyOverrides: DependencyOverrides | undefined
): Dependencies {
  // parse dependency overrides
  const depOverridesAlways: [string, string][] = [];
  const depOverridesByOption: [string, [string, string][]][] = [];
  const devDepOverridesAlways: [string, string][] = [];
  const devDepOverridesByOption: [string, [string, string][]][] = [];
  const peerDepOverridesAlways: [string, string][] = [];
  const peerDepOverridesByOption: [string, [string, string][]][] = [];

  /**
   * Parses name and required version from `item` and adds them into the given
   * `alwaysArr` or `byOptionArr`.
   */
  function parseOverrideNamesAndVersions(
    item: (OptionDependency | Package) | Package[],
    alwaysArr: [string, string][],
    byOptionArr?: [string, [string, string][]][]
  ): void {
    if (typeof item === 'string') {
      alwaysArr.push([item, '']);
    } else if ('package' in item) {
      alwaysArr.push(
        item.version ? [item.package, item.version] : [item.package, '']
      );
    } else if ('option' in item && Array.isArray(item.packages)) {
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
  if (dependencyOverrides?.peerDependencies) {
    dependencyOverrides.peerDependencies.forEach((dep) =>
      parseOverrideNamesAndVersions(
        dep,
        peerDepOverridesAlways,
        peerDepOverridesByOption
      )
    );
  }

  // collect default dependencies
  function templateDependenciesToTuples(
    source: Record<string, string> | undefined
  ): [string, string][] {
    if (source) {
      return Object.keys(source).map((key) => [key, source[key]]);
    }
    return [];
  }

  const depsWithDefaults: [string, string][] = templateDependenciesToTuples(
    templateDependencies.dependencies
  );
  const devDepsWithDefaults: [string, string][] = templateDependenciesToTuples(
    templateDependencies.devDependencies
  );
  const peerDepsWithDefaults: [string, string][] = templateDependenciesToTuples(
    templateDependencies.peerDependencies
  );

  function pushAsTuples(source: string[], target: [string, string][]) {
    const tuples: [string, string][] = source.map((d) => [d, '']);
    target.push(...tuples);
  }

  function collectDeps(source: Record<string, DefaultDependencies>) {
    options.forEach((option) => {
      if (option in source) {
        if (source[option].dependencies) {
          pushAsTuples(source[option].dependencies, depsWithDefaults);
        }
        if (source[option].devDependencies) {
          pushAsTuples(source[option].devDependencies, devDepsWithDefaults);
        }
        if (source[option].peerDependencies) {
          pushAsTuples(source[option].peerDependencies, peerDepsWithDefaults);
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

  applyOverride(depOverridesAlways, depsWithDefaults);
  applyOverride(devDepOverridesAlways, devDepsWithDefaults);
  applyOverride(peerDepOverridesAlways, peerDepsWithDefaults);

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
        devDepsWithDefaults
      );
    }

    const peerDepOverrideIndex = peerDepOverridesByOption.findIndex(
      (o) => o[0] === option
    );
    if (peerDepOverrideIndex !== -1) {
      applyOverride(
        peerDepOverridesByOption[peerDepOverrideIndex][1],
        peerDepsWithDefaults
      );
    }
  });

  // fill versions from list of latest versions where missing
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
  peerDepsWithDefaults.forEach((d, index) => {
    if (!d[1]) {
      peerDepsWithDefaults[index][1] = LATEST_DEPENDENCY_VERSIONS[d[0]];
    }
  });

  return {
    dependencies: Object.fromEntries(depsWithDefaults),
    devDependencies: Object.fromEntries(devDepsWithDefaults),
    peerDependencies: Object.fromEntries(peerDepsWithDefaults),
  };
}

/**
 * Imports a configuration function dynamically from configurationScripts
 * directory and runs it with the given parameters.
 * @param scriptName Name of the script file withou file extension.
 * @param s The clack/prompts spinner object to use for outputting error.
 * @param param2 Parameters for the configuration function.
 */
async function runScript(
  scriptName: string,
  s: SpinnerObject,
  {
    projectName,
    targetDirPath,
    templateDirPath,
    configFileTemplateDirPath,
    options,
  }: ConfigureScriptProps
) {
  const scriptNameToUse = scriptName.endsWith('.js')
    ? scriptName.substring(0, scriptName.length - 3)
    : scriptName;
  const functionName = scriptNameToUse.split('.')[0];
  try {
    const module: unknown = await import(
      `./configurationScripts/${scriptName}.js`
    );
    (
      module as {
        [scriptNameToUse]: (
          projectName: ConfigureScriptProps['projectName'],
          targetDirPath: ConfigureScriptProps['targetDirPath'],
          templateDirPath: ConfigureScriptProps['templateDirPath'],
          configFileTemplateDirPath: ConfigureScriptProps['configFileTemplateDirPath'],
          options: ConfigureScriptProps['options']
        ) => void;
      }
    )[functionName](
      projectName,
      targetDirPath,
      templateDirPath,
      configFileTemplateDirPath,
      options
    );
  } catch (error) {
    s.stop(
      `Unable to run configure script "${scriptNameToUse}": ${
        (error as Error).message
      }`,
      1
    );
  }
}

/**
 * Reads the template configuration file from the target directory, removes the
 * file and returns its contents as an object.
 */
function readAndRemoveTemplateFileConfig(
  targetDirPath: string
): Record<string, string | TemplateConfig> {
  // read template file config from the target dir
  const templateFileConfigPath = path.join(
    targetDirPath,
    TEMPLATE_FILE_CONFIG_FILE_NAME
  );
  const configFileJson = JSON.parse(
    fs.readFileSync(templateFileConfigPath, 'utf-8')
  ) as Record<string, string | TemplateConfig>;

  // remove template file config file from the target dir
  fs.rmSync(templateFileConfigPath);

  return configFileJson;
}

/**
 * Runs a configure function for each selected option.
 */
async function configureOptions(
  projectName: string,
  targetDirPath: string,
  templateDirPath: string,
  configFileTemplateDirPath: string,
  options: string[],
  templateFileConfigJson: Record<string, string | TemplateConfig>,
  packageManager: string,
  s: SpinnerObject
) {
  // configure options
  for (const option of options) {
    if (option === 'eslint') {
      configureESLint(
        targetDirPath,
        templateFileConfigJson,
        configFileTemplateDirPath,
        options,
        s
      );
    } else if (option === 'prettier') {
      configurePrettier(targetDirPath, configFileTemplateDirPath);
    } else if (option === 'editorconfig') {
      configureEditorConfig(targetDirPath, configFileTemplateDirPath);
    } else if (option === 'vitest') {
      const configScriptName = getScriptName(
        (templateFileConfigJson as { vitest: string | TemplateConfig }).vitest
      );
      if (configScriptName) {
        await runScript(configScriptName, s, {
          projectName,
          targetDirPath,
          templateDirPath,
          configFileTemplateDirPath,
          options,
        });
      }
    } else if (option === 'githooks') {
      s.stop(
        `configureOptions(): Configuration for "${option}" is not yet implemented.`,
        1
      );
    } else if (option === 'husky') {
      configureHusky(
        targetDirPath,
        templateFileConfigJson,
        configFileTemplateDirPath,
        options,
        packageManager,
        s
      );
    } else if (option === 'githubActions') {
      s.stop(
        `configureOptions(): Configuration for "${option}" is not yet implemented.`,
        1
      );
    } else if (option === 'releasePlease') {
      s.stop(
        `configureOptions(): Configuration for "${option}" is not yet implemented.`,
        1
      );
    } else if (option === 'react') {
      await runScript('configureVite.react', s, {
        projectName,
        targetDirPath,
        templateDirPath,
        configFileTemplateDirPath,
        options,
      });
    }
  }
}

/**
 * Sorts properties of a `Record<strin, string>` to an alphabetical order by
 * the keys so that keys starting with "@" character come before keys starting
 * with a letter.
 */
function sortObjectKeys<T extends Record<string, string>>(
  obj: T
): Record<string, string> {
  const sortedKeys = Object.keys(obj).sort((a, b) => {
    const aIsAt = a.startsWith('@');
    const bIsAt = b.startsWith('@');

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

/**
 * Assigns scripts to a package.json scripts object based on the options.
 *
 * New values are assigned to the object given as an argument.
 * @param options Selected options.
 * @param scripts A `Record<string, string>` object containing scripts to which
 *    the new scripts are added.
 */
function setScripts(options: string[], scripts: Record<string, string>) {
  if (options.includes('eslint')) {
    Object.assign(scripts, {
      lint: 'eslint .',
    });
  }
  if (options.includes('vitest')) {
    Object.assign(scripts, {
      test: 'vitest run',
      'test:watch': 'vitest watch',
      'test:coverage': 'vitest run --coverage',
      'test:coverage:watch': 'vitest watch --coverage',
    });
  }
  if (options.includes('husky')) {
    Object.assign(scripts, {
      prepare: 'husky',
    });
  }
}

/**
 * Updates the created project with the selected options by doing required
 * modifications to the configuration files and running configuration scripts
 * corresponding to the selected options.
 * @param targetDirPath Path to the directory where the new project was created.
 * @param templateDirPath Path to the template directory.
 * @param configFileTemplateDirPath Path to the configuration file template
 *    directory.
 * @param projectName Name of the created project.
 * @param options The selected options.
 * @param projectDependencyOverrides Dependency overrides from the template
 *    object.
 * @param packageManager Package manager to be used for installing the
 *    dependencies if that is requested.
 * @param installDeps Boolean indicateing whether to install the dependencies.
 * @param s The clack/prompts spinner object to use for outputting error.
 */
export async function updateCreatedProject(
  targetDirPath: string,
  templateDirPath: string,
  configFileTemplateDirPath: string,
  projectName: string,
  options: string[],
  projectDependencyOverrides: DependencyOverrides | undefined,
  packageManager: string,
  installDeps: boolean,
  s: SpinnerObject
) {
  // read template package.json from the target directory
  const packageJsonPath = path.join(targetDirPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    s.stop(
      red(
        `Error: Could not find package.json from the target directory "${targetDirPath}".`
      ),
      1
    );
    outro(red('Operation stopped - Failed to copy template files.'));
    process.exit(1);
  }
  const packageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, 'utf-8')
  ) as Record<string, unknown>;

  // update package.json with project name and dependencies
  packageJson.name = projectName;
  const templateDependencies = {
    dependencies: packageJson.dependencies as Record<string, string>,
    devDependencies: packageJson.devDependencies as Record<string, string>,
    peerDependencies: packageJson.peerDependencies as Record<string, string>,
  };
  const dependencies = getDependencies(
    options,
    templateDependencies,
    projectDependencyOverrides
  );

  function assignDependencies(
    source: Record<string, string> | undefined,
    target: string
  ) {
    if (source && Object.keys(source).length > 0) {
      packageJson[target] = sortObjectKeys(source);
    }
  }

  assignDependencies(dependencies.dependencies, 'dependencies');
  assignDependencies(dependencies.devDependencies, 'devDependencies');
  assignDependencies(dependencies.peerDependencies, 'peerDependencies');

  // add scripts to package.json
  setScripts(options, packageJson.scripts as Record<string, string>);

  // write modified package.json to the target directory
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + '\n',
    'utf-8'
  );

  const templateFileConfigJson = readAndRemoveTemplateFileConfig(targetDirPath);

  // configure optional tools
  await configureOptions(
    projectName,
    targetDirPath,
    templateDirPath,
    configFileTemplateDirPath,
    options,
    templateFileConfigJson,
    packageManager,
    s
  );

  // configure readme file
  configureReadme(
    targetDirPath,
    configFileTemplateDirPath,
    templateFileConfigJson,
    options,
    s
  );

  // install dependencies if requested
}
