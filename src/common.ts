import fs from 'node:fs';
import path from 'node:path';
import { SpinnerObject, TemplateConfig } from './types';

export function getTemplateName(config: string | TemplateConfig) {
  if (typeof config === 'object') {
    return config.template;
  }
  return config;
}

export function getScriptName(config: string | TemplateConfig) {
  if (typeof config === 'object') {
    return config.script;
  }
  return null;
}

export function getConfigFileTemplateContent(
  templateConfigJson: Record<string, string | TemplateConfig>,
  configFileName: string,
  configFileTemplateDirPath: string,
  s: SpinnerObject
) {
  const configFileTemplateName = getTemplateName(
    templateConfigJson[configFileName]
  );
  if (!configFileTemplateName) {
    s.stop(
      `No configuration for ${configFileName} in template config file.`,
      1
    );
    return null;
  }
  const templatePath = path.resolve(
    configFileTemplateDirPath,
    configFileTemplateName
  );
  return fs.readFileSync(templatePath, 'utf-8');
}
