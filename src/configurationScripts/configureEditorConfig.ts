import path from 'node:path';
import fs from 'node:fs';

const EDITOR_CONFIG_FILE_NAME = '.editorconfig';

export function configureEditorConfig(
  targetDirPath: string,
  configFileTemplateDirPath: string
) {
  const srcFile = path.resolve(
    configFileTemplateDirPath,
    EDITOR_CONFIG_FILE_NAME
  );
  const destFile = path.resolve(targetDirPath, EDITOR_CONFIG_FILE_NAME);
  fs.copyFileSync(srcFile, destFile);
}
