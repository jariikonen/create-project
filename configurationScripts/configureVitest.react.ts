import path from 'node:path';
import fs from 'node:fs';
import { parse } from 'comment-json';

const TESTSETUP_FILE_NAME = 'testSetup.ts';
const TSCONFIG_FILE_NAME = 'tsconfig.node.json';

function copyTestSetup(
  targetDirPath: string,
  configFileTemplateDirPath: string
) {
  const srcFile = path.resolve(configFileTemplateDirPath, TESTSETUP_FILE_NAME);
  const destFile = path.resolve(targetDirPath, TESTSETUP_FILE_NAME);
  fs.copyFileSync(srcFile, destFile);
}

function includeTestSetupInTsConfig(targetDirPath: string) {
  const filePath = path.join(targetDirPath, TSCONFIG_FILE_NAME);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const tsConfigJson = parse(fileContent) as unknown as {
    include: string[];
  };
  tsConfigJson.include = [...tsConfigJson.include, 'testSetup.ts'];
  fs.writeFileSync(
    filePath,
    JSON.stringify(tsConfigJson, null, 2) + '\n',
    'utf-8'
  );
}

export function configureVitest(
  targetDirPath: string,
  configFileTemplateDirPath: string,
  options: string[]
) {
  if (options.includes('reactTestingLibrary')) {
    copyTestSetup(targetDirPath, configFileTemplateDirPath);
    includeTestSetupInTsConfig(targetDirPath);
  }
}
