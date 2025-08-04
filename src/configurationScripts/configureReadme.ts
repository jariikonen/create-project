import path from 'node:path';
import fs from 'node:fs';
import Handlebars from 'handlebars';
import { SpinnerObject, TemplateConfig } from '@shared/types';
import { getConfigFileTemplateContent } from '@shared/common';

const README_FILE_NAME = 'README.md';

function mapOptionsToData(options: string[], s: SpinnerObject) {
  function getValue(optionName: string) {
    switch (optionName) {
      case 'eslint':
        return { display: 'ESLint', link: 'eslint' };
      case 'prettier':
        return { display: 'Prettier', link: 'prettier' };
      case 'editorconfig':
        return { display: 'EditorConfig', link: 'editorconfig' };
      case 'vitest':
        return { display: 'Vitest', link: 'vitest' };
      default:
        s.stop(
          `configureReadme.mapOptions(): There is no case for "${optionName}"`,
          1
        );
    }
  }

  const mappedOptions = Object.fromEntries(
    options.map((key) => [key, getValue(key)])
  );
  return Object.fromEntries(
    Object.entries(mappedOptions).filter(([, value]) => value !== undefined)
  );
}

function registerPartials(
  partials: { filename: string; name: string }[],
  configFileTemplateDirPath: string
) {
  partials.forEach((data) => {
    const partialContent = fs.readFileSync(
      path.join(configFileTemplateDirPath, 'readmePartials', data.filename),
      'utf8'
    );
    Handlebars.registerPartial(data.name, partialContent);
  });
}

export function configureReadme(
  targetDirPath: string,
  configFileTemplateDirPath: string,
  templateFileConfigJson: Record<string, string | TemplateConfig>,
  options: string[],
  s: SpinnerObject
) {
  // register partials
  registerPartials(
    [
      { filename: 'common.hbs', name: 'common' },
      { filename: 'eslint.hbs', name: 'eslintPartial' },
      { filename: 'prettier.hbs', name: 'prettierPartial' },
      { filename: 'vitest.hbs', name: 'vitestPartial' },
      { filename: 'editorconfig.hbs', name: 'editorconfigPartial' },
      { filename: 'githooks.hbs', name: 'githooksPartial' },
      { filename: 'husky.hbs', name: 'huskyPartial' },
      { filename: 'githubActions.hbs', name: 'githubActionsPartial' },
      { filename: 'releasePlease.hbs', name: 'releasePleasePartial' },
    ],
    configFileTemplateDirPath
  );

  // collect config data to be applied on the template
  const configData = {
    options,
    optionData: { ...mapOptionsToData(options, s) },
  };

  // apply data on the template
  const templateContent = getConfigFileTemplateContent(
    templateFileConfigJson,
    'readme',
    configFileTemplateDirPath,
    s
  );
  const template = Handlebars.compile(templateContent);
  const output = template(configData);

  // write to file
  const outputPath = path.resolve(targetDirPath, README_FILE_NAME);
  fs.writeFileSync(outputPath, output);
}
