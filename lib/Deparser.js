const fs = require('fs');
const path = require('path');
const lockfile = require('@yarnpkg/lockfile');

const PACKAGE_JSON_FILE = 'package.json';
const YARN_LOCK_FILE = 'yarn.lock';
const DEP_TYPES = {
  DEP: 'dependencies',
  DEV: 'devDependencies',
  PEER: 'peerDependencies',
  BUNDLED: 'bundledDependencies',
  OPTIONAL: 'optionalDependencies'
};

class Deparser {
  constructor(packageJSONPath=PACKAGE_JSON_FILE, lockFilePath=YARN_LOCK_FILE) {
    const _packageJSONPath = path.join(process.cwd(), packageJSONPath);
    const _lockFilePath = path.join(process.cwd(), lockFilePath);

    if (fs.existsSync(_packageJSONPath)) {
      if (fs.existsSync(_lockFilePath)) {
        this.packageJSON = require(_packageJSONPath);
        this.lockFile = fs.readFileSync(_lockFilePath, 'utf8');
        this.lockFilePackages = lockfile.parse(this.lockFile).object;
        // Assign id (index) to each dependency to use id when creating edges
        Object.keys(this.lockFilePackages).map((pkg, index) => {
          this.lockFilePackages[pkg].id = index;
        });
      } else {
        console.error(`[deparser:error] yarn.lock file not found: ${_lockFilePath}`);
      }
    } else {
      console.error(`[deparser:error] package.json file not found: ${_packageJSONPath}`);
    }
  }

  getDirectDependencies() {
    return this.getAllIntents().map(dependency => {
      return {
        name: Deparser.getPackageNameFromIntent(dependency),
        version: this.lockFilePackages[dependency].version
      }
    });
  }

  // generates a tree structure
  getDependencyTree(dependencies = this.getAllIntents(), path = '') {
    return dependencies.map(dep => {
      const dependency = this.lockFilePackages[dep];
      let dependencyType;
      if (!path) {
        dependencyType = this.getDependencyType(dep);
      }
      const result = {
        name: dep.substring(dep.lastIndexOf('@'), 0),
        version: dependency.version
      };
      if (dependencyType) {
        result.type = dependencyType;
      }

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

  // generates graph structure with list of all modules and their edges
  getDependencyGraph() {
    const modules = [];
    const edges = [];
  
    Object.keys(this.lockFilePackages).forEach(dep => {
      const dependency = this.lockFilePackages[dep];
      const result = {
        name: dep.substring(dep.lastIndexOf('@'), 0),
        version: dependency.version,
        id: dependency.id
      };

      if (dependency.dependencies) {
        Object.keys(dependency.dependencies).forEach(key => {
          edges.push({
            source: dependency.id,
            target: this.lockFilePackages[`${key}@${dependency.dependencies[key]}`].id
          });
        });
      }

      modules.push(result);
    });

    return {
      modules,
      edges
    };
  }

  getIntents(dependencies) {
    return Object.keys(dependencies).map(dep => dep + '@' + dependencies[dep]);
  }

  getAllIntents() {
    const allDependencies = Object.assign(
      {},
      this.packageJSON[DEP_TYPES.DEP],
      this.packageJSON[DEP_TYPES.DEV],
      this.packageJSON[DEP_TYPES.PEER],
      this.packageJSON[DEP_TYPES.BUNDLED],
      this.packageJSON[DEP_TYPES.OPTIONAL]
    );
    return this.getIntents(allDependencies);
  }

  getDependencyType(dependency) {
    const parsedDependency = dependency.split('@');
    const name = parsedDependency[0];
    const version = parsedDependency[1];
    const dep = this.packageJSON[DEP_TYPES.DEP];
    const devDep = this.packageJSON[DEP_TYPES.DEV];
    const peerDep = this.packageJSON[DEP_TYPES.PEER];
    const bundledDep = this.packageJSON[DEP_TYPES.BUNDLED];
    const optionalDep = this.packageJSON[DEP_TYPES.OPTIONAL];

    if (dep && dep[name] === version) {
      return DEP_TYPES.DEP;
    } else if (devDep && devDep[name] === version) {
      return DEP_TYPES.DEV;
    } else if (peerDep && peerDep[name] === version) {
      return DEP_TYPES.PEER;
    } else if (bundledDep && bundledDep[name] === version) {
      return DEP_TYPES.BUNDLED;
    } else if (optionalDep && optionalDep[name] === version) {
      return DEP_TYPES.OPTIONAL;
    }
  }

  exportDependencyTree(exportFilePath) {
    const absoluteExportPath = path.join(process.cwd(), exportFilePath);
    fs.writeFile(
      absoluteExportPath,
      JSON.stringify(this.getDependencyTree(), null, 2),
      () => console.info(`Dependency tree saved to: ${absoluteExportPath}`)
    );
  }

  static getPackageNameFromIntent(intent) {
    return intent.substring(intent.lastIndexOf('@'), 0);
  }
}

module.exports = Deparser;
