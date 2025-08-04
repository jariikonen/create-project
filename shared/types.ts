import { spinner } from '@clack/prompts';

export type ColorFunc = (str: string | number) => string;

export interface Template {
  name: string;
  label: string;
  hint: string;
  color: ColorFunc;
  templateDir: string;
  options: TemplateOption[];
  projectDependencyOverrides?: DependencyOverrides;
  projectOptions?: string[];
  recommended?: string[];
}

export interface TemplateOption {
  name: string;
  label: string;
  hint: string;
  customCommand?: string;
}

export type Package = string | { package: string; version: string };

export interface OptionDependency {
  option?: string;
  packages: Package[];
}

export interface DependencyOverrides {
  dependencies?: (OptionDependency | Package)[];
  devDependencies?: (OptionDependency | Package)[];
  peerDependencies?: (OptionDependency | Package)[];
}

export interface DefaultDependencies {
  dependencies?: string[];
  devDependencies?: string[];
  peerDependencies?: string[];
  withOption?: Record<string, DefaultDependencies>;
}

export interface Dependencies {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

type Spinner = typeof spinner;
export type SpinnerObject = ReturnType<Spinner>;

export interface Import {
  default?: string;
  named?: string[];
  source: string;
}

export interface TemplateConfig {
  template?: string;
  script?: string;
}

export interface ConfigureScriptProps {
  projectName: string;
  targetDirPath: string;
  templateDirPath: string;
  configFileTemplateDirPath: string;
  options: string[];
}
