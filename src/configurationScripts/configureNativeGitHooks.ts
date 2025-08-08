import fs from 'node:fs';
import path from 'node:path';
import Handlebars from 'handlebars';
import { SpinnerObject, TemplateConfig } from '@shared/types';
import { getConfigFileTemplateContent } from '@shared/common';

const CONFIG_FILE_NAME = 'pre-commit';

export function configureNativeGitHooks(
  targetDirPath: string,
  templateFileConfigJson: Record<string, string | TemplateConfig>,
  configFileTemplateDirPath: string,
  options: string[],
  packageManager: string,
  s: SpinnerObject
) {
  Handlebars.registerHelper('join', function (arr: string[], sep: string) {
    return arr.join(sep);
  });

  // collect config data to be applied on the template
  const configData = {
    eslint: options.includes('eslint'),
    vitest: options.includes('vitest'),
    packageManager,
  };

  // apply data on the template
  const templateContent = getConfigFileTemplateContent(
    templateFileConfigJson,
    'githooks',
    configFileTemplateDirPath,
    s
  );
  if (!templateContent) {
    s.stop(
      'configureNativeGitHooks(): Could not configure Git-hooks - no template.',
      1
    );
    return;
  }
  const template = Handlebars.compile(templateContent);
  const output = template(configData);

  // create git-hooks/ directory, write the pre-commit hook file and make it
  // executable
  const hooksDirPath = path.resolve(targetDirPath, 'git-hooks');
  const filePath = path.resolve(hooksDirPath, CONFIG_FILE_NAME);
  fs.mkdirSync(hooksDirPath);
  fs.writeFileSync(filePath, output);
  fs.chmodSync(filePath, '755');
}
