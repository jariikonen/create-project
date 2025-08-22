import path from 'node:path';
import fs from 'node:fs';
import {
  AdditionalArgumentsVitest,
  ConfigureScriptProps,
  SpinnerObject,
} from '@shared/types';
import {
  addTypesToTsconfig,
  addVitestGlobalsToTsconfig,
  includeFileInTsconfig,
} from '@shared/common';

function copyTestSetup(
  targetDirPath: string,
  configFileTemplateDirPath: string,
  testSetupFileName: string
) {
  const srcFile = path.resolve(configFileTemplateDirPath, testSetupFileName);
  const destFile = path.resolve(targetDirPath, testSetupFileName);
  fs.copyFileSync(srcFile, destFile);
}

function includeTestSetupInTsconfig(
  targetDirPath: string,
  testSetupTsconfig: string,
  testSetupFileName: string
) {
  const tsconfigFilePath = path.join(targetDirPath, testSetupTsconfig);
  includeFileInTsconfig(testSetupFileName, tsconfigFilePath);
}

export function configureVitest(
  _projectName: ConfigureScriptProps['projectName'],
  targetDirPath: ConfigureScriptProps['targetDirPath'],
  _templateDirPath: ConfigureScriptProps['templateDirPath'],
  configFileTemplateDirPath: ConfigureScriptProps['configFileTemplateDirPath'],
  options: ConfigureScriptProps['options'],
  additionalArguments: Record<string, unknown>,
  s: SpinnerObject
) {
  const additionalArgs =
    additionalArguments as unknown as AdditionalArgumentsVitest;

  const globalsTsconfig = additionalArgs?.globalsTsconfig;
  if (!globalsTsconfig) {
    s.stop(
      `configureVitest(): No other.globalsTsconfig property in template.config.json.`,
      1
    );
    return;
  }
  addVitestGlobalsToTsconfig(targetDirPath, globalsTsconfig);

  if (options.includes('reactTestingLibrary')) {
    const globalsTsconfigPath = path.join(targetDirPath, globalsTsconfig);
    addTypesToTsconfig('@testing-library/jest-dom', globalsTsconfigPath);

    const testSetupTsconfig = additionalArgs?.testSetupTsconfig;
    if (!testSetupTsconfig) {
      s.stop(
        `configureVitest(): No other.testSetupTsconfig property in template.config.json.`,
        1
      );
      return;
    }
    const testSetupFileName = additionalArgs?.testSetupFileName;
    if (!testSetupFileName) {
      s.stop(
        `configureVitest(): No other.testSetupFileName property in template.config.json.`,
        1
      );
      return;
    }
    copyTestSetup(targetDirPath, configFileTemplateDirPath, testSetupFileName);
    includeTestSetupInTsconfig(
      targetDirPath,
      testSetupTsconfig,
      testSetupFileName
    );
  }
}
