import { copyFile, includeFileInTsconfig } from '@shared/common';
import { ConfigureScriptProps } from '@shared/types';
import path from 'node:path';

export function configureVitest(
  _projectName: ConfigureScriptProps['projectName'],
  targetDirPath: ConfigureScriptProps['targetDirPath'],
  _templateDirPath: ConfigureScriptProps['templateDirPath'],
  configFileTemplateDirPath: ConfigureScriptProps['configFileTemplateDirPath']
) {
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
