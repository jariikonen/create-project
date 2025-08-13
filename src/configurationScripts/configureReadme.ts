import path from 'node:path';
import fs from 'node:fs';
import Handlebars from 'handlebars';
import { SpinnerObject, TemplateConfig } from '@shared/types';
import { getConfigFileTemplateContent, registerPartials } from '@shared/common';

const README_FILE_NAME = 'README.md';

function mapOptionsToDisplayData(options: string[], s: SpinnerObject) {
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
      case 'githooks':
        return { display: 'Git hooks', link: 'git-hooks' };
      case 'husky':
        return { display: 'Husky', link: 'husky' };
      case 'reactTestingLibrary':
        return {
          display: 'React Testing Library',
          link: 'react-testing-library',
        };
      case 'githubActions':
        return {
          display: 'GitHub Actions Workflows',
          link: 'github-actions-workflows',
        };
      case 'react':
      case 'lib':
        return;
      default:
        s.stop(
          `configureReadme.mapOptionsToData(): There is no case for "${optionName}"`,
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

function mapWorkflows(workflows: string[]) {
  return Object.fromEntries(workflows.map((key) => [key, true]));
}

export function configureReadme(
  targetDirPath: string,
  configFileTemplateDirPath: string,
  templateFileConfigJson: Record<string, string | TemplateConfig>,
  options: string[],
  workflows: string[],
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
      {
        filename: 'reactTestingLibrary.hbs',
        name: 'reactTestingLibraryPartial',
      },
      { filename: 'ciWorkflow.hbs', name: 'ciPartial' },
      {
        filename: 'releasePleaseWorkflow.hbs',
        name: 'releasePleasePartial',
      },
      { filename: 'publishNpmWorkflow.hbs', name: 'publishNpmPartial' },
    ],
    path.join(configFileTemplateDirPath, 'readmePartials')
  );

  // collect config data to be applied on the template
  const configData = {
    options,
    optionData: { ...mapOptionsToDisplayData(options, s) },
    workflowsToInclude: { ...mapWorkflows(workflows) },
    includeWorkflows: workflows.length > 0,
  };

  // apply data on the template
  const templateContent = getConfigFileTemplateContent(
    templateFileConfigJson,
    'readme',
    configFileTemplateDirPath,
    s
  );
  if (!templateContent) {
    s.stop(
      'configureReadme(): Could not configure README.md - no template.',
      1
    );
    return;
  }
  const template = Handlebars.compile(templateContent);
  const output = template(configData);

  // write to file
  const outputPath = path.resolve(targetDirPath, README_FILE_NAME);
  fs.writeFileSync(outputPath, output);
}
