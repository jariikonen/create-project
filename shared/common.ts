import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'comment-json';
import { SpinnerObject, TemplateConfig } from '@shared/types';

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

export function copyFile(
  srcFilename: string,
  srcDirPath: string,
  targetDirPath: string,
  targetFilename?: string
) {
  targetFilename = targetFilename ?? srcFilename;
  const srcFile = path.resolve(srcDirPath, srcFilename);
  const destFile = path.resolve(targetDirPath, targetFilename);
  fs.copyFileSync(srcFile, destFile);
}

export function includeFileInTsconfig(filename: string, tsconfigPath: string) {
  const tsconfigJson = parse(
    fs.readFileSync(tsconfigPath, 'utf-8')
  ) as unknown as {
    include: string[];
  };
  tsconfigJson.include = [...tsconfigJson.include, filename];
  fs.writeFileSync(
    tsconfigPath,
    JSON.stringify(tsconfigJson, null, 2) + '\n',
    'utf-8'
  );
}
