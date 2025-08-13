import fs from 'node:fs';
import path from 'node:path';
import Handlebars from 'handlebars';
import { camelToKebab, registerPartials } from '@shared/common';
import { configureReleasePlease } from './configureReleasePlease';

export function configureGitHubActions(
  targetDirPath: string,
  configFileTemplateDirPath: string,
  workflows: string[],
  packageManager: string
) {
  const workflowTemplatePath = path.join(
    configFileTemplateDirPath,
    'workflows'
  );

  // register handlebars helpers
  Handlebars.registerHelper('eq', function (key: string, value: string) {
    return key === value;
  });
  Handlebars.registerHelper('encloseInDoubleCurly', function (value: string) {
    return new Handlebars.SafeString(`{{ ${value} }}`);
  });

  // register handlebars partials
  registerPartials(
    [{ filename: 'installDeps.hbs', name: 'installDepsPartial' }],
    path.join(workflowTemplatePath, 'partials')
  );

  // create .github/workflows directory
  const workflowDirPath = path.join(targetDirPath, '.github', 'workflows');
  if (!fs.existsSync(workflowDirPath)) {
    fs.mkdirSync(workflowDirPath, { recursive: true });
  }

  for (const workflow of workflows) {
    // collect config data to be applied on the template
    const configData = {
      packageManager,
    };

    // apply data on the template
    let templateContent = '';
    const templatePath = path.join(
      workflowTemplatePath,
      `${camelToKebab(workflow)}.yaml.hbs`
    );
    templateContent = fs.readFileSync(templatePath, 'utf-8');
    const template = Handlebars.compile(templateContent);
    const output = template(configData);

    // write workflow
    const filePath = path.join(
      workflowDirPath,
      `${camelToKebab(workflow)}.yaml`
    );
    fs.writeFileSync(filePath, output);
  }

  // configure Release-Please if selected
  if (workflows.includes('releasePlease')) {
    configureReleasePlease(targetDirPath, configFileTemplateDirPath);
  }
}
