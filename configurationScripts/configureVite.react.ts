import fs from 'node:fs';
import path from 'node:path';
import Handlebars from 'handlebars';

const TEMPLATE_FILE_NAME = 'vite.config.react.hbs';
const CONFIG_FILE_NAME = 'vite.config.ts';

function getTemplateContent(
  configFileTemplateDirPath: string,
  templateName: string
) {
  const templatePath = path.resolve(configFileTemplateDirPath, templateName);
  return fs.readFileSync(templatePath, 'utf-8');
}

export function configureVite(
  projectName: string,
  targetDirPath: string,
  _templateDirPath: string,
  configFileTemplateDirPath: string,
  options: string[]
) {
  // collect config data to be applied on the template
  const defineConfigSource = options.includes('vitest')
    ? 'vitest/config'
    : 'vite';
  const testConfig = options.includes('vitest');
  const testingLibrary = options.includes('reactTestingLibrary');
  const buildConfig = options.includes('lib');
  const configData = {
    defineConfigSource,
    testConfig,
    testingLibrary,
    buildConfig,
    projectName,
  };

  // apply data on the template
  const templateContent = getTemplateContent(
    configFileTemplateDirPath,
    TEMPLATE_FILE_NAME
  );
  const template = Handlebars.compile(templateContent);
  const output = template(configData);

  // write to file
  const outputPath = path.resolve(targetDirPath, CONFIG_FILE_NAME);
  fs.writeFileSync(outputPath, output);
}
