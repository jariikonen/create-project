import path from 'node:path';
import fs from 'node:fs';

function copyFile(srcDir: string, destDir: string, filename: string) {
  const srcFilePath = path.join(srcDir, filename);
  const destFilePath = path.join(destDir, filename);
  fs.copyFileSync(srcFilePath, destFilePath);
}

export function configureReleasePlease(
  targetDirPath: string,
  configFileTemplateDirPath: string
) {
  const workflowDirPath = path.join(configFileTemplateDirPath, 'workflows');
  copyFile(workflowDirPath, targetDirPath, 'release-please-config.json');
  copyFile(workflowDirPath, targetDirPath, '.release-please-manifest.json');
}
