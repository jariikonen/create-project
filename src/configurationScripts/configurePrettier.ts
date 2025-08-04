import { copyFile } from '@shared/common';

export function configurePrettier(
  targetDirPath: string,
  configFileTemplateDirPath: string
) {
  copyFile('.prettierrc.json', configFileTemplateDirPath, targetDirPath);
  copyFile('.prettierignore', configFileTemplateDirPath, targetDirPath);
}
