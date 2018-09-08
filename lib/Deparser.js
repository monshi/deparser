const fs = require('fs');
const path = require('path');
const lockfile = require('@yarnpkg/lockfile');

class Deparser {
  constructor(packageJSONPath="package.json", lockFilePath="yarn.lock") {
    const _packageJSONPath = path.join(process.cwd(), packageJSONPath);
    const _lockFilePath = path.join(process.cwd(), lockFilePath);

    if (fs.existsSync(_packageJSONPath)) {
      if (fs.existsSync(_lockFilePath)) {
        this.packageJSON = require(_packageJSONPath);
        this.lockFile = fs.readFileSync(_lockFilePath, 'utf8');
        this.lockFilePackages = lockfile.parse(this.lockFile).object;
      } else {
        console.error(`[deparser:error] yarn.lock file not found: ${_lockFilePath}`);
      }
    } else {
      console.error(`[deparser:error] package.json file not found: ${_packageJSONPath}`);
    }
  }

  getDirectDependencies() {
    return this.getIntents().map(dependency => {
      return {
        name: Deparser.getPackageNameFromIntent(dependency),
        version: this.lockFilePackages[dependency].version
      }
    });
  }

  getDependencyTree(dependencies = this.getIntents(), path = '') {
    return dependencies.map(dep => {
      const dependency = this.lockFilePackages[dep];
      const result = {
        name: dep.substring(dep.lastIndexOf('@'), 0),
        version: dependency.version
      };

      if (dependency.dependencies) {
        const fullPath = path + '>' + dep;
        // short-circuit if it's a circular dependency
        if (path && path.indexOf('>' + dep) !== -1) {
          result.circular = fullPath.trim();
        } else {
          result.children = this.getDependencyTree(this.getIntents(dependency.dependencies), fullPath);
        }
      }
      return result;
    });
  }

  getIntents(dependencies = this.packageJSON.dependencies) {
    return Object.keys(dependencies).map(dep => dep + '@' + dependencies[dep]);
  }

  static getPackageNameFromIntent(intent) {
    return intent.substring(intent.lastIndexOf('@'), 0);
  }
}

module.exports = Deparser;
