import path from 'node:path';
import fs from 'node:fs';

const PRETTIER_RC_FILE_NAME = '.prettierrc.json';

export function configurePrettier(
  targetDirPath: string,
  configFileTemplateDirPath: string
) {
  const srcFile = path.resolve(
    configFileTemplateDirPath,
    PRETTIER_RC_FILE_NAME
  );
  const destFile = path.resolve(targetDirPath, PRETTIER_RC_FILE_NAME);
  fs.copyFileSync(srcFile, destFile);
}
