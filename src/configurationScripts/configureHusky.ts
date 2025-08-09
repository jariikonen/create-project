import fs from 'node:fs';
import path from 'node:path';
import Handlebars from 'handlebars';
import { SpinnerObject, TemplateConfig } from '@shared/types';
import { getConfigFileTemplateContent } from '@shared/common';

const CONFIG_FILE_NAME = 'pre-commit';

export function configureHusky(
  targetDirPath: string,
  templateFileConfigJson: Record<string, string | TemplateConfig>,
  configFileTemplateDirPath: string,
  options: string[],
  packageManager: string,
  s: SpinnerObject
) {
  // collect config data to be applied on the template
  const configData = {
    eslint: options.includes('eslint'),
    vitest: options.includes('vitest'),
    husky: true,
    packageManager,
  };

  // apply data on the template
  const templateContent = getConfigFileTemplateContent(
    templateFileConfigJson,
    'husky',
    configFileTemplateDirPath,
    s
  );
  if (!templateContent) {
    s.stop('configureHusky(): Could not configure Husky - no template.', 1);
    return;
  }
  const template = Handlebars.compile(templateContent);
  const output = template(configData);

  // write to file
  const outputPath = path.resolve(targetDirPath, CONFIG_FILE_NAME);
  fs.writeFileSync(outputPath, output);
}
