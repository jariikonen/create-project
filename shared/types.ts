import { spinner } from '@clack/prompts';

/**
 * Represents an output coloring function.
 *
 * In practice functions from picocolor are used.
 */
export type ColorFunc = (str: string | number) => string;

/**
 * Represents a template object that contains data for both presenting
 * the template in the select prompt and for configuring the template.
 */
export interface Template {
  /** The name of the template used internally. */
  name: string;
  /** Label to be used for presenting the template in the select prompt. */
  label: string;
  /** More verbous description of the template used in the select prompt. */
  hint: string;
  /** Color used for presenting the template in the select prompt. */
  color: ColorFunc;
  /** Directory where the template files are located. */
  templateDir: string;
  /** The options available for this template. */
  options: TemplateOption[];
  /** Dependency overrides used in this template. */
  projectDependencyOverrides?: DependencyOverrides;
  /** Special options that take effect when creating this template. */
  projectOptions?: string[];
  /** The recommended options  */
  recommended?: string[];
}

/**
 * Represents an option that can be selected for a template.
 *
 * Contains properties for presenting the option in the select prompt.
 */
export interface TemplateOption {
  /** The name of the option used internally. */
  name: string;
  /** Label to be used for presenting the option in the select prompt. */
  label: string;
  /** More verbous description of the template used in the select prompt. */
  hint: string;
}

/**
 * Represents a dependency configuration for a package.
 *
 * A package can be defined either by its name or a name and a version.
 */
export type Package = string | { package: string; version: string };

/**
 * Represents a dependency configuration for packages that are used when a
 * specific option is selected.
 */
export interface OptionDependency {
  /**
   * Name of the option that must be selected when the dependency
   * configuration is used.
   */
  option?: string;
  /** List of package configurations. */
  packages: Package[];
}

/**
 * Represents an object containing dependency overrides for all package.json
 * dependency properties.
 */
export interface DependencyOverrides {
  /** Overrides for the `dependencies` property. */
  dependencies?: (OptionDependency | Package)[];
  /** Overrides for the `devDependencies` property. */
  devDependencies?: (OptionDependency | Package)[];
  /** Overrides for the `peerDependencies` property. */
  peerDependencies?: (OptionDependency | Package)[];
}

/**
 * Represents an object containing default dependencies for all package.json
 * dependency properties.
 *
 * Default dependencies define only the package name without version. There is
 * also an optional field for dependency configurations for situations when
 * some other options are used.
 */
export interface DefaultDependencies {
  /**
   * Dependency configurations that go into the package.json `dependencies`
   * property.
   */
  dependencies?: string[];
  /**
   * Dependency configurations that go into the package.json `devDependencies`
   * property.
   */
  devDependencies?: string[];
  /**
   * Dependency configurations that go into the package.json `peerDependencies`
   * property.
   */
  peerDependencies?: string[];
  /**
   * Dependency configurations that are used when specific options are used.
   */
  withOption?: Record<string, DefaultDependencies>;
}

/**
 * Represents an object containing dependency configurations for all
 * package.json dependency properties.
 */
export interface Dependencies {
  /**
   * Dependency configurations that go into the package.json `dependencies`
   * property.
   */
  dependencies?: Record<string, string>;
  /**
   * Dependency configurations that go into the package.json `devDependencies`
   * property.
   */
  devDependencies?: Record<string, string>;
  /**
   * Dependency configurations that go into the package.json `peerDependencies`
   * property.
   */
  peerDependencies?: Record<string, string>;
}

/**
 * Type of the object returned by the clack/prompts `spinner` function.
 *
 * Spinner object can be used for controlling the spinner and output of the
 * clack/prompts.
 */
export type SpinnerObject = ReturnType<typeof spinner>;

/**
 * Represents an object used for passing data on import directives to a
 * Handlebars template.
 */
export interface Import {
  /** What to use as the name for the default import. */
  default?: string;
  /** What to put into the named imports field. */
  named?: string[];
  /** What to use as the source of the import. */
  source: string;
}

/**
 * Represents a template configuration on a template.config.json file.
 *
 * The template.config.json file is of type Record<string, TemplateConfig>
 * where the key is name of the thing to be configured, e.g., user selectable
 * template option or other thing to be configured such as "readme", which
 * refers to the README.md file.
 */
export interface TemplateConfig {
  /** Name of the template file containing the extension (.hbs). */
  template?: string;
  /**
   * Name of a dynamically imported configuration script file.
   *
   * Filename may contain file extension .js or .ts, but it is not necessary.
   * These file extension are replaced with .js when looking for the script
   * file. Any other file extensions are assumed to be part of the file name
   * and extension .js is added to the end. The first part of the name
   * (separated by a period) is treated as the name of the function.
   */
  script?: string;
  /** Additional arguments for the configuration script. */
  other?: Record<string, unknown>;
}

/**
 * Represents the arguments passed to a dynamically imported configuration
 * function.
 */
export interface ConfigureScriptProps {
  /** Name of the created project. */
  projectName: string;
  /** Path to the directory where the project is created. */
  targetDirPath: string;
  /** Path to the directory where the template files are located. */
  templateDirPath: string;
  /**
   * Path to the directory where the configuration file templates are located.
   */
  configFileTemplateDirPath: string;
  /** List of selected options. */
  options: string[];
  /** List of additional arguments given in template.config.json. */
  additionalArguments?: Record<string, unknown>;
  /**
   * A clack/prompts spinner object for outputting errors and other messages.
   */
  s?: SpinnerObject;
}

/**
 * Represents the template.config.json additional arguments object for vitest.
 */
export interface AdditionalArgumentsVitest {
  /** The filename to add into tsconfig's include property. */
  testSetupFileName?: string;
  /** The tsconfig file to which the filename is added. */
  testSetupTsconfig?: string;
  /** The tsconfig file to which the vitest/globals types property is added. */
  globalsTsconfig: string;
}
