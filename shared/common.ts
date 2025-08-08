import fs from 'node:fs';
import path from 'node:path';
import { CommentArray, parse, stringify } from 'comment-json';
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

export function getAdditionalArguments(config: string | TemplateConfig) {
  if (typeof config === 'object') {
    return config.other;
  }
  return undefined;
}

/**
 * Returns configuration file template content based on the filename in
 * `templateConfigJson`.
 *
 * Returns the template contents or null, if the template filename is not
 * found.
 * @param templateConfigJson The template's `template.config.json` file's
 *    contents as an object.
 * @param configObjectName Name of the configurable thing (e.g., template
 *    option).
 * @param configFileTemplateDirPath Path to the directory where the
 *    configuration file templates are located.
 * @param s The clack/prompts spinner object to use for outputting error.
 * @returns Template contents or null if the template filename is not found.
 */
export function getConfigFileTemplateContent(
  templateConfigJson: Record<string, string | TemplateConfig>,
  configObjectName: string,
  configFileTemplateDirPath: string,
  s: SpinnerObject
) {
  const configFileTemplateName = getTemplateName(
    templateConfigJson[configObjectName]
  );
  if (!configFileTemplateName) {
    s.stop(
      `No configuration for ${configObjectName} in template config file.`,
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

/**
 * Copies the `srcDir` to `destDir` recursively.
 */
export function copyDir(srcDir: string, destDir: string) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file);
    const destFile = path.resolve(destDir, file);
    copy(srcFile, destFile);
  }
}

/**
 * Copies the `src` to `dest` using copyDir or fs.copyFileSync depending on
 * whether the `src` is a directory or a file.
 */
export function copy(src: string, dest: string) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    copyDir(src, dest);
  } else {
    fs.copyFileSync(src, dest);
  }
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

/**
 * Includes `filename` in tsconfig file in `tsconfigPath`.
 *
 * Uses comment-json for parsing and strigifying json.
 * @param filename Filename to add to the tsconfig's include property.
 * @param tsconfigPath Path to the tsconfig file.
 */
export function includeFileInTsconfig(filename: string, tsconfigPath: string) {
  const tsconfigJson = parse(
    fs.readFileSync(tsconfigPath, 'utf-8')
  ) as unknown as {
    include: string[];
  };
  tsconfigJson.include = new CommentArray<string>(
    ...tsconfigJson.include,
    filename
  );
  fs.writeFileSync(
    tsconfigPath,
    stringify(tsconfigJson, null, 2) + '\n',
    'utf-8'
  );
}

export function addGlobalsToTsconfig(
  targetDirPath: string,
  globalsTsconfig: string
) {
  const tsconfigPath = path.join(targetDirPath, globalsTsconfig);
  addTypesToTsconfig('vitest/globals', tsconfigPath, 'Vitest');
}

export function addTypesToTsconfig(
  typesDescriptor: string,
  tsconfigPath: string,
  comment?: string
) {
  const tsconfigJson = parse(
    fs.readFileSync(tsconfigPath, 'utf-8')
  ) as unknown as {
    compilerOptions: { types: string[] };
  };
  const newTypes = tsconfigJson.compilerOptions.types
    ? new CommentArray<string>(
        ...tsconfigJson.compilerOptions.types,
        typesDescriptor
      )
    : new CommentArray<string>(typesDescriptor);
  tsconfigJson.compilerOptions.types = newTypes;

  if (comment) {
    const compilerOptions = tsconfigJson.compilerOptions as unknown as {
      [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      [key: symbol]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    };
    if (compilerOptions) {
      compilerOptions[Symbol.for('before:types')] = [
        {
          type: 'BlockComment',
          value: ` ${comment} `,
          inline: false,
        },
      ];
    }
  }

  fs.writeFileSync(
    tsconfigPath,
    stringify(tsconfigJson, null, 2) + '\n',
    'utf-8'
  );
}
