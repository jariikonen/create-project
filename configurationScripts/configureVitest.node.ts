import {
  addGlobalsToTsconfig,
  copyFile,
  includeFileInTsconfig,
} from '@shared/common';
import {
  AdditionalArgumentsVitest,
  ConfigureScriptProps,
  SpinnerObject,
} from '@shared/types';
import path from 'node:path';

export function configureVitest(
  _projectName: ConfigureScriptProps['projectName'],
  targetDirPath: ConfigureScriptProps['targetDirPath'],
  _templateDirPath: ConfigureScriptProps['templateDirPath'],
  configFileTemplateDirPath: ConfigureScriptProps['configFileTemplateDirPath'],
  _options: ConfigureScriptProps['options'],
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
  addGlobalsToTsconfig(targetDirPath, globalsTsconfig);
  copyFile(
    'vitest.config.node.ts',
    configFileTemplateDirPath,
    targetDirPath,
    'vitest.config.ts'
  );
  includeFileInTsconfig(
    'vitest.config.ts',
    path.join(targetDirPath, 'tsconfig.json')
  );
}
