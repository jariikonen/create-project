import 'source-map-support/register';
import { promisify } from 'node:util';
import { exec as execCallback } from 'node:child_process';
import type { ExecException } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  intro,
  outro,
  confirm,
  select,
  multiselect,
  spinner,
  cancel,
  text,
  log,
  ConfirmOptions,
  SelectOptions,
  MultiSelectOptions,
  TextOptions,
  note,
} from '@clack/prompts';
import color from 'picocolors';
import mri from 'mri';
import {
  copyTemplate,
  createDir,
  clearDir,
  resolveAndValidateTargetDirPath,
  getProjectName,
  isDir,
  isEmpty,
  isValidPackageName,
  logError,
  prompt,
  updateCreatedProject,
  sortOptions,
} from './functions';
import { SpinnerObject, Template, TemplateOption } from '@shared/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { cyan, green, yellow: warning } = color;

const argv = mri<{
  template?: string;
  help?: boolean;
  overwrite?: boolean;
}>(process.argv.slice(2), {
  alias: { h: 'help', t: 'template', o: 'overwrite' },
  boolean: ['help', 'overwrite'],
  string: ['template'],
});

// prettier-ignore
const helpMessage = `\
Usage: create-project [OPTION]... [DIRECTORY]

Create a new TypeScript project.
With no arguments, start the CLI in interactive mode.

Options:
  -h, --help                 display this help message
  -t, --template NAME        use a specific template
  --overwrite                overwrite previous project

Available templates:
${green(
  'node         Node.js project template (Node.js + TypeScript + tsdown)'
)}
${cyan('react        React project template (React + TypeScript + Vite)')}
${cyan(
  'react-lib    React component library template (React + TypeScript + Vite)'
)}`;

type ConfirmReturn = boolean | symbol;
type SelectReturn<T> = symbol | T;
type MultiSelectReturn<T> = symbol | T[];
type TextReturn = string | symbol;

const DEFAULT_PACKAGE_NAME = 'my-project';
const DEFAULT_PATH = `.${path.sep}${DEFAULT_PACKAGE_NAME}`;

const OPTION_ESLINT: TemplateOption = {
  name: 'eslint',
  label: 'ESLint',
  hint: 'Configure ESLint linting.',
};

const OPTION_PRETTIER: TemplateOption = {
  name: 'prettier',
  label: 'Prettier',
  hint: 'Configure Prettier code formatter.',
};

const OPTION_EDITOR_CONFIG: TemplateOption = {
  name: 'editorconfig',
  label: 'EditorConfig',
  hint: 'Add .editorconfig file for setting consistent editor settings.',
};

const OPTION_VITEST: TemplateOption = {
  name: 'vitest',
  label: 'Vitest',
  hint: 'Add Vitest testing framework.',
};

const OPTION_GITHOOKS: TemplateOption = {
  name: 'githooks',
  label: 'Native git-hooks',
  hint: 'Configure a directory for native git-hooks and add a pre-commit hook.',
};

const OPTION_HUSKY: TemplateOption = {
  name: 'husky',
  label: 'Husky',
  hint: 'Configure Husky git-hook manager and add a pre-commit hook.',
};

const OPTION_GITHUB_ACTIONS: TemplateOption = {
  name: 'githubActions',
  label: 'GitHub Actions',
  hint: 'Add GH Actions workflows. Select which ones to add in the next step.',
};

/** The options common to all (or the most) of the templates. */
const COMMON_OPTIONS = [
  OPTION_ESLINT,
  OPTION_PRETTIER,
  OPTION_EDITOR_CONFIG,
  OPTION_VITEST,
  OPTION_GITHOOKS,
  OPTION_HUSKY,
  OPTION_GITHUB_ACTIONS,
];

/** The recommended options from the COMMON_OPTIONS. */
const COMMON_RECOMMENDED = ['eslint', 'prettier', 'editorconfig'];

/** Options specific to the React Testing Library. */
const OPTION_REACT_TESTING_LIBRARY: TemplateOption = {
  name: 'reactTestingLibrary',
  label: 'React Testing Library',
  hint: 'A testing library for testing React components.',
};

/** Options specific to React. */
const REACT_OPTIONS = [OPTION_REACT_TESTING_LIBRARY];

const OPTION_CI: TemplateOption = {
  name: 'ci',
  label: 'CI Workflow',
  hint: 'Runs tests and other code quality tools.',
};

const OPTION_PUBLISH_NPM: TemplateOption = {
  name: 'publishNpm',
  label: 'Publish package to npm registry',
  hint: 'Publishes the package to npm after a new release has been created.',
};

const OPTION_RELEASE_PLEASE: TemplateOption = {
  name: 'releasePlease',
  label: 'Release Please',
  hint: 'Creates new releases automatically based on conventional commit messages.',
};

/** GH Actions Workflow options. */
const WORKFLOW_OPTIONS = [OPTION_CI, OPTION_PUBLISH_NPM, OPTION_RELEASE_PLEASE];

/**
 * Template objects containing both template configuration data and data used
 * for presenting the template in the select prompt.
 */
const TEMPLATES: Template[] = [
  {
    name: 'node',
    label: 'Node',
    hint: 'A basic Node.js TS project.',
    color: green,
    templateDir: 'template-node',
    options: [...COMMON_OPTIONS],
    recommended: [...COMMON_RECOMMENDED],
  },
  {
    name: 'react',
    label: 'React',
    hint: 'A React TS web application project.',
    color: cyan,
    templateDir: 'template-react',
    options: [...COMMON_OPTIONS, ...REACT_OPTIONS],
    projectOptions: ['react'],
    recommended: [...COMMON_RECOMMENDED],
  },
  {
    name: 'react-lib',
    label: 'React-lib',
    hint: 'A TS project for creating a React component library.',
    color: cyan,
    templateDir: 'template-react-lib',
    options: [...COMMON_OPTIONS, ...REACT_OPTIONS],
    projectOptions: ['react', 'lib'],
    recommended: [...COMMON_RECOMMENDED],
  },
];

async function main() {
  const data = await readFile(path.join(__dirname, '../package.json'), 'utf8');
  const { version } = JSON.parse(data) as { version: string };

  // handle --help flag
  if (argv.help) {
    console.log(helpMessage);
    process.exit(0);
  }

  // parse and validate target directory path (if in arguments)
  const posArg0 = argv._[0] ? String(argv._[0]) : undefined;
  let argTargetDir: string | undefined = undefined;
  if (posArg0) {
    const result = resolveAndValidateTargetDirPath(posArg0);
    if (result.success) {
      argTargetDir = result.value;
    } else {
      logError(`\n${result.error}`);
    }
  }

  // form suggestion for the project's name based on the target directory path
  let argProjectName = getProjectName(argTargetDir!);
  let targetDir = argTargetDir;
  if (argProjectName && !isValidPackageName(argProjectName)) {
    logError(`\n"${argProjectName}" is not a valid package name.`);
    argProjectName = DEFAULT_PACKAGE_NAME;
    targetDir = DEFAULT_PATH;
  }

  console.log(); // empty line before the prompts

  // intro
  intro(color.bgBlue(color.white(` create-project v${version} `)));

  // 1. prompt for project name
  const defaultProjectName = argProjectName || 'my-project';
  const projectName = await prompt<TextOptions, TextReturn>(text, {
    message: 'Project name:',
    defaultValue: defaultProjectName,
    placeholder: defaultProjectName,
    validate: (value) => {
      if (!value || value.length === 0) return undefined;
      if (!isValidPackageName(value))
        return 'Please enter a valid package name. (see: https://docs.npmjs.com/cli/v11/configuring-npm/package-json#name)';
    },
  });

  // 2. prompt for directory
  if (!targetDir) {
    const defaultTargetDir = path.resolve(projectName);
    targetDir = await prompt<TextOptions, TextReturn>(text, {
      message: 'Where to create the project?',
      defaultValue: defaultTargetDir,
      placeholder: defaultTargetDir,
      validate: (value) => {
        if (!value || value.length === 0) return undefined;
        const result = resolveAndValidateTargetDirPath(value);
        if (!result.success) {
          return result.error;
        }
      },
    });
  }
  const targetDirPath = targetDir;
  log.step(`Using target directory: ${targetDirPath}`);

  // 3. handle target if is a file instead of a directory
  if (fs.existsSync(targetDirPath) && !isDir(targetDirPath)) {
    const overwrite = argv.overwrite
      ? true
      : await prompt<ConfirmOptions, ConfirmReturn>(confirm, {
          message: warning(
            `Target "${targetDirPath}" is not a directory. Please choose how to proceed:`
          ),
          active: 'Delete the file and continue',
          inactive: 'Cancel operation',
        });

    switch (overwrite) {
      case true: {
        const confirmDelete = await prompt<ConfirmOptions, ConfirmReturn>(
          confirm,
          {
            message: warning(
              `Are you sure you want to delete file "${targetDirPath}"?`
            ),
          }
        );
        if (confirmDelete) {
          fs.rmSync(targetDirPath, { force: true });
        } else {
          cancel('Operation cancelled.');
          process.exit(1);
        }
        break;
      }
      case false:
        cancel('Operation cancelled.');
        process.exit(1);
    }
  }

  // 4. handle directory if exists and not empty
  const cwd = process.cwd();
  if (fs.existsSync(targetDirPath) && !isEmpty(targetDirPath)) {
    const overwrite = argv.overwrite
      ? 'yes'
      : await prompt(select, {
          message: warning(
            (targetDirPath === cwd
              ? 'Current directory'
              : `Target directory "${targetDirPath}"`) +
              ` is not empty. Please choose how to proceed:`
          ),
          options: [
            {
              label: 'Cancel operation',
              value: 'no',
            },
            {
              label: 'Remove existing files and continue',
              value: 'yes',
            },
            {
              label: 'Ignore files and continue',
              value: 'ignore',
            },
          ],
        });

    switch (overwrite) {
      case 'yes': {
        const confirmDelete = await prompt<ConfirmOptions, ConfirmReturn>(
          confirm,
          {
            message: warning(
              `Are you sure you want to delete all files in "${targetDirPath}"?`
            ),
          }
        );
        if (confirmDelete) {
          clearDir(targetDir);
        } else {
          cancel('Operation cancelled.');
          process.exit(1);
        }
        break;
      }
      case 'no':
        cancel('Operation cancelled.');
        process.exit(1);
    }
  }

  // 4. prompt for template
  let template = TEMPLATES.find((t) => t.name === argv.template);
  const noTemplatePrompt = template ? true : false;
  template ??= await prompt<SelectOptions<Template>, SelectReturn<Template>>(
    select,
    {
      message: 'Select template:',
      options: TEMPLATES.map((t) => {
        return {
          value: t,
          label: `${t.color(t.label)}`,
          hint: t.hint,
        };
      }),
    }
  );
  if (noTemplatePrompt) {
    log.step(`Using template: ${template.color(template.label)}`);
  }

  // 5. prompt for additional tools / options
  const initialValues = template.recommended ?? [];
  const optionChoices = template.options.map((o) => {
    const label = initialValues.includes(o.name)
      ? `${template.color(o.label + ' (recommended)')}`
      : `${template.color(o.label)}`;
    return {
      value: o.name,
      label,
      hint: o.hint,
    };
  });
  let options = await prompt<
    MultiSelectOptions<string>,
    MultiSelectReturn<string>
  >(multiselect, {
    message: 'Select additional tools:',
    initialValues,
    required: false,
    maxItems: 10,
    options: optionChoices,
  });

  // 6. handle mutually exclusive options
  if (options.includes('husky') && options.includes('githooks')) {
    const gitHooksImplementation = await prompt<
      SelectOptions<string>,
      SelectReturn<string>
    >(select, {
      message: warning(
        'It is not possible to select both Husky and native git-hooks. Select which one to use:'
      ),
      options: [
        {
          label: 'Native git-hooks',
          value: 'githooks',
        },
        {
          label: 'Husky',
          value: 'husky',
        },
      ],
    });

    const removeIndex =
      gitHooksImplementation === 'husky'
        ? options.indexOf('githooks')
        : options.indexOf('husky');
    options = [
      ...options.slice(0, removeIndex),
      ...options.slice(removeIndex + 1, options.length),
    ];
  }

  // 7. handle options that require another option to be selected
  if (options.includes('reactTestingLibrary') && !options.includes('vitest')) {
    const addVitest = await prompt<ConfirmOptions, ConfirmReturn>(confirm, {
      message: warning(
        'It is not possible to select React Testing Library without selecting Vitest. Add vitest?'
      ),
      active: 'Yes',
      inactive: 'No',
    });
    if (addVitest) {
      options.push('vitest');
    }
  }

  // 8. sort options
  // clack/prompts MultiSelect returns the selected options in the order they
  // are selected, but this would mess the order of the options in README.md,
  // so we sort the options to match the order they were specified in
  // optionChoices
  options = sortOptions(optionChoices, options);
  options = [...options, ...(template.projectOptions ?? [])];

  // 9. prompt for GH Actions workflows if githubActions was selected
  let workflows: string[] = [];
  if (options.includes('githubActions')) {
    const optionChoices = WORKFLOW_OPTIONS.map((o) => {
      return {
        value: o.name,
        label: o.label,
        hint: o.hint,
      };
    });
    workflows = await prompt<
      MultiSelectOptions<string>,
      MultiSelectReturn<string>
    >(multiselect, {
      message: 'Select GH Actions workflows to add:',
      options: optionChoices,
    });
  }

  // 10. prompt whether the dependencies should be installed
  const installDeps = await prompt<ConfirmOptions, ConfirmReturn>(confirm, {
    message: 'Install dependencies?',
    active: 'Yes',
    inactive: 'No',
  });

  // 11. prompt for package manager (if workflows are added or dependencies are
  // installed)
  let packageManager = 'npm';
  if (workflows.length > 0 || installDeps) {
    packageManager = await prompt<SelectOptions<string>, SelectReturn<string>>(
      select,
      {
        message: 'Select package manager:',
        options: [
          {
            label: 'npm',
            value: 'npm',
          },
          {
            label: 'pnpm',
            value: 'pnpm',
          },
        ],
      }
    );
  }

  // 12. prompt whether the git should be initialized
  let initGit = await prompt<ConfirmOptions, ConfirmReturn>(confirm, {
    message: 'Initialize Git?',
    active: 'Yes',
    inactive: 'No',
  });

  const gitIsInitialized = fs.existsSync(path.join(targetDirPath, '.git'));

  if (initGit && gitIsInitialized) {
    initGit = await prompt<ConfirmOptions, ConfirmReturn>(confirm, {
      message: warning(
        'Git has already been initialized. Are you sure you want to re-initialize it?'
      ),
      active: 'Yes',
      inactive: 'No',
    });
  }

  // 13. scaffold the project
  const s = spinner();

  const templateDirPath = path.resolve(
    __filename,
    '../..',
    template.templateDir
  );
  const configFileTemplateDirPath = path.resolve(
    __filename,
    '../..',
    'configFileTemplates'
  );

  s.start(`Creating the project directory (${targetDirPath})...`);
  createDir(targetDirPath, s);
  s.stop(`Created the project directory ("${targetDirPath}").`);

  s.start(`Copying template ${template.label} to the project directory...`);
  copyTemplate(templateDirPath, targetDirPath, s);
  s.stop(`Copied template "${template.label}" to the project directory.`);

  s.start('Tailoring the project to match the requested settings...');
  await updateCreatedProject(
    targetDirPath,
    templateDirPath,
    configFileTemplateDirPath,
    projectName,
    options,
    workflows,
    template.projectDependencyOverrides,
    packageManager,
    s
  );
  s.stop('Project has been tailored to match your settings.');

  // 13. initialize Git if requested
  const exec = promisify(execCallback);
  if (initGit) {
    try {
      const { stdout } = await exec('git init', { cwd: targetDirPath });
      log.step('Git initialized successfully.');
      if (stdout) {
        log.message(stdout);
      }
    } catch (error) {
      const e = error as ExecException & { stdout: string; stderr: string };
      log.error('Git initialization failed.');
      if (e.stdout) {
        log.message(e.stdout);
      }
      if (e.stderr) {
        log.message(e.stderr);
      }
    }
  }

  // 14. install dependencies if requested
  let gitNeedsInitializing = options.includes('husky') && !initGit;

  function handleSuccess(s: SpinnerObject) {
    s.stop('Dependencies installed succesfully');
  }

  function handleGitNotInitialized(
    s: SpinnerObject,
    e?: ExecException & { stdout: string; stderr: string }
  ) {
    handleSuccess(s);
    gitNeedsInitializing = true;
    log.error(
      `Could not prepare ${
        e ? 'Git hooks' : 'husky'
      }. You need to initialize Git and run "prepare".`
    );
    if (e && e.stdout) {
      log.message(e.stdout);
    }
    if (e && e.stderr) {
      log.message(e.stderr);
    }
  }

  function handleError(
    s: SpinnerObject,
    e: ExecException & { stdout: string; stderr: string }
  ) {
    s.stop('Dependency installation returned with an error.', 1);
    if (e.stdout) {
      log.message(e.stdout);
    }
    if (e.stderr) {
      log.message(`stderr: ${e.stderr}`);
    }
  }

  if (installDeps) {
    s.start(`Installing dependencies using ${packageManager}...`);
    const command = `${packageManager} install`;
    try {
      const { stdout } = await exec(command, { cwd: targetDirPath });
      if (stdout.includes(".git can't be found")) {
        handleGitNotInitialized(s);
      } else {
        handleSuccess(s);
        if (stdout) {
          log.message(stdout);
        }
      }
    } catch (error) {
      const e = error as ExecException & { stdout: string; stderr: string };
      if (
        e.stderr.includes('fatal: not in a git directory') &&
        e.stderr.length < 31
      ) {
        handleGitNotInitialized(s, e);
      } else {
        handleError(s, e);
      }
    }
  }

  // 15. output next steps
  const projectDirPath = path.relative(process.cwd(), targetDirPath);
  const marginLength =
    projectDirPath.length < 12 ? 4 + (12 - projectDirPath.length) : 4;
  const margin = ' '.repeat(marginLength);
  const nextSteps = `    cd ${projectDirPath}${margin}\n    ${
    gitNeedsInitializing ? `git init\n    ` : ''
  }${installDeps ? '' : `${packageManager} install\n    `}${
    gitNeedsInitializing ? `${packageManager} run prepare\n    ` : ''
  }${packageManager} run dev`;
  note(nextSteps, 'Next steps:');
  outro("You're all set!");
}

main().catch(console.error);
