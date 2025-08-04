import fs from 'node:fs';
import path from 'node:path';
import Handlebars from 'handlebars';
import { Import, SpinnerObject, TemplateConfig } from '@shared/types';
import { getConfigFileTemplateContent } from '@shared/common';

const CONFIG_FILE_NAME = 'eslint.config.mjs';

function getImports(options: string[]) {
  const imports: Import[] = [];
  if (options.includes('prettier')) {
    imports.push({
      default: 'eslintConfigPrettier',
      source: 'eslint-config-prettier/flat',
    });
  }
  if (options.includes('reactTestingLibrary')) {
    imports.push({
      default: 'testingLibrary',
      source: 'eslint-plugin-testing-library',
    });
  }
  if (options.includes('vitest')) {
    imports.push({
      default: 'vitest',
      source: '@vitest/eslint-plugin',
    });
  }
  return imports;
}

function getIgnores(options: string[]) {
  const ignores: string[] = [`'dist'`];
  if (options.includes('eslint')) {
    ignores.push(`'eslint.config.mjs'`);
  }
  return ignores;
}

function getShareableConfigs(options: string[]) {
  const shareableConfigs: string[] = [];
  if (options.includes('prettier')) {
    shareableConfigs.push('eslintConfigPrettier');
  }
  return shareableConfigs.length > 0 ? shareableConfigs : null;
}

function getTestConfig(options: string[]) {
  const vitest = options.includes('vitest');
  const testingLibrary = options.includes('reactTestingLibrary');

  if (!vitest) {
    return false;
  }
  return {
    vitestPlugin: vitest,
    testingLibrary: testingLibrary,
  };
}

export function configureESLint(
  targetDirPath: string,
  templateFileConfigJson: Record<string, string | TemplateConfig>,
  configFileTemplateDirPath: string,
  options: string[],
  s: SpinnerObject
) {
  Handlebars.registerHelper('join', function (arr: string[], sep: string) {
    return arr.join(sep);
  });

  // collect config data to be applied on the template
  const imports = getImports(options);
  const ignores = getIgnores(options);
  const shareableConfigs = getShareableConfigs(options);
  const testConfig = getTestConfig(options);
  const configData = {
    imports,
    ignores,
    shareableConfigs,
    testConfig,
  };

  // apply data on the template
  const templateContent = getConfigFileTemplateContent(
    templateFileConfigJson,
    'eslint',
    configFileTemplateDirPath,
    s
  );
  const template = Handlebars.compile(templateContent);
  const output = template(configData);

  // write to file
  const outputPath = path.resolve(targetDirPath, CONFIG_FILE_NAME);
  fs.writeFileSync(outputPath, output);
}
