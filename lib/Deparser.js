const fs = require('fs');
const path = require('path');
const lockfile = require('@yarnpkg/lockfile');

const PACKAGE_JSON_FILE = 'package.json';
const YARN_LOCK_FILE = 'yarn.lock';
const DEP_TYPES = {
  DEP: {
    source: 'dependencies',
    output: 'dependency'
  },
  DEV: {
    source: 'devDependencies',
    output: 'devDependency'
  },
  PEER: {
    source: 'peerDependencies',
    output: 'peerDependency'
  },
  BUNDLED: {
    source: 'bundledDependencies',
    output: 'bundledDependency'
  },
  OPTIONAL: {
    source: 'optionalDependencies',
    output: 'optionalDependency'
  }
};

class Deparser {
  constructor(packageJSONPath=PACKAGE_JSON_FILE, lockFilePath=YARN_LOCK_FILE) {
    const _packageJSONPath = path.join(process.cwd(), packageJSONPath);
    const _lockFilePath = path.join(process.cwd(), lockFilePath);

    if (fs.existsSync(_packageJSONPath)) {
      if (fs.existsSync(_lockFilePath)) {

        // get list of all lock file packages
        // assign id to each entry

        this.packageJSON = require(_packageJSONPath);
        this.lockFile = fs.readFileSync(_lockFilePath, 'utf8');
        this.lockFilePackages = lockfile.parse(this.lockFile).object;
        this.normalizedLockFileEntries = {};
        let entryId = 0;
        this.directDependencyTypesMap = {};

        const {name: packageName, version: packageVersion} = this.packageJSON;
        const rootPackage = `${packageName}@${packageVersion}`;
        this.lockFilePackages[rootPackage] = {
          version: packageVersion,
          id: undefined,
          dependencies: {}
        };
        this.rootPackage = this.lockFilePackages[rootPackage];

        // Assign id (index) to each dependency to use id when creating edges
        Object.keys(this.lockFilePackages).map((pkg) => {
          const lockFileEntry = this.lockFilePackages[pkg];
          const depName = pkg.substring(pkg.lastIndexOf('@'), 0);
          const depType = this.getDependencyType(pkg);
          const intent = pkg.substring(pkg.lastIndexOf('@') + 1);

          if (lockFileEntry.id === undefined) {
            lockFileEntry.id = entryId;
            this.normalizedLockFileEntries[pkg] = lockFileEntry;
            entryId = entryId + 1;
          }

          // We're handling a separate intent that's resolved to the same lockfile package a previous intent has resolved to.
          if (depType && !this.lockFilePackages[rootPackage].dependencies[depName]) {
            this.lockFilePackages[rootPackage].dependencies[depName] = intent;
            this.directDependencyTypesMap[lockFileEntry.id] = depType;
          }
        });
      } else {
        console.error(`[deparser:error] yarn.lock file not found: ${_lockFilePath}`);
      }
    } else {
      console.error(`[deparser:error] package.json file not found: ${_packageJSONPath}`);
    }
  }

  getRootPackage() {
    const {name, version} = this.packageJSON;
    return {
      name,
      version,
      root: true
    };
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
      result.dependencyType = dependencyType || DEP_TYPES.DEP.output;

      const mapDependencies = (dependency, depType = DEP_TYPES.DEP) => {
        const fullPath = path + '>' + dep;
        // short-circuit if it's a circular dependency
        if (path && path.indexOf('>' + dep) !== -1) {
          result.circular = fullPath.trim();
        } else {
          result.children = this.getDependencyTree(this.getIntents(dependency[depType.source]), fullPath);
          result.children.map(dep => dep.dependencyType = depType.output);
        }
      };

      Object.keys(DEP_TYPES).forEach(depType => {
        if (dependency[DEP_TYPES[depType].source]) {
          mapDependencies(dependency, DEP_TYPES[depType]);
        }
      });
      
      return result;
    });
  }

  // generates graph structure with list of all modules and their edges
  getDependencyGraph() {
    const modules = [];
    const edges = [];

    const mapDependencies = (dependency, depType = DEP_TYPES.DEP) => {
      const dependencies = dependency[depType.source];
      Object.keys(dependencies).forEach(key => {
        const targetId = this.lockFilePackages[`${key}@${dependencies[key]}`].id;
        const output = {
          source: dependency.id,
          target: targetId,
          dependencyType: depType.output
        };
        if (dependency.id === this.rootPackage.id) {
          output.dependencyType = this.directDependencyTypesMap[targetId];
        }

        edges.push(output);
      });
    };
  
    Object.keys(this.normalizedLockFileEntries).forEach(dep => {
      const dependency = this.normalizedLockFileEntries[dep];
      const result = {
        name: dep.substring(dep.lastIndexOf('@'), 0),
        version: dependency.version,
        id: dependency.id
      };
      result.dependencyType = this.directDependencyTypesMap[dependency.id] || DEP_TYPES.DEP.output;

      Object.keys(DEP_TYPES).forEach(depType => {
        if (dependency[DEP_TYPES[depType].source]) {
          mapDependencies(dependency, DEP_TYPES[depType]);
        }
      });

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
      this.packageJSON[DEP_TYPES.DEP.source],
      this.packageJSON[DEP_TYPES.DEV.source],
      this.packageJSON[DEP_TYPES.PEER.source],
      this.packageJSON[DEP_TYPES.BUNDLED.source],
      this.packageJSON[DEP_TYPES.OPTIONAL.source]
    );
    return this.getIntents(allDependencies);
  }

  getDependencyType(dependency) {
    const lastIndexOfAt = dependency.lastIndexOf('@');
    const name = dependency.substring(0, lastIndexOfAt);
    const version = dependency.substring(lastIndexOfAt + 1);
    const dep = this.packageJSON[DEP_TYPES.DEP.source];
    const devDep = this.packageJSON[DEP_TYPES.DEV.source];
    const peerDep = this.packageJSON[DEP_TYPES.PEER.source];
    const bundledDep = this.packageJSON[DEP_TYPES.BUNDLED.source];
    const optionalDep = this.packageJSON[DEP_TYPES.OPTIONAL.source];

    if (dep && dep[name] === version) {
      return DEP_TYPES.DEP.output;
    } else if (devDep && devDep[name] === version) {
      return DEP_TYPES.DEV.output;
    } else if (peerDep && peerDep[name] === version) {
      return DEP_TYPES.PEER.output;
    } else if (bundledDep && bundledDep[name] === version) {
      return DEP_TYPES.BUNDLED.output;
    } else if (optionalDep && optionalDep[name] === version) {
      return DEP_TYPES.OPTIONAL.output;
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

  exportDependencyGraph(exportFilePath) {
    const absoluteExportPath = path.join(process.cwd(), exportFilePath);
    fs.writeFile(
      absoluteExportPath,
      JSON.stringify(this.getDependencyGraph(), null, 2),
      () => console.info(`Dependency graph saved to: ${absoluteExportPath}`)
    );
  }

  static getPackageNameFromIntent(intent) {
    return intent.substring(intent.lastIndexOf('@'), 0);
  }
}

module.exports = Deparser;
