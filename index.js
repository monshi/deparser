const fs = require('fs');
const path = require('path');
const util = require('./lib/util');

const packageJSONPath = path.join(process.cwd(), 'package.json');
const yarnLockPath = path.join(process.cwd(), 'yarn.lock');

function parseYarn() {
  if (fs.existsSync(packageJSONPath)) {
    if (fs.existsSync(yarnLockPath)) {
      const packageJSON = require(packageJSONPath);
      const yarnLockFile = fs.readFileSync(yarnLockPath, 'utf8');
      return JSON.stringify(util.getYarnDependencyTree(packageJSON, yarnLockFile), null, 2);
    } else {
      console.error(`[deparser:error] yarn.lock file not found: ${yarnLockPath}`);
    }
  } else {
    console.error(`[deparser:error] package.json file not found: ${packageJSONPath}`);
  }
};

module.exports = parseYarn;
