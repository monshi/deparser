const lockfile = require('@yarnpkg/lockfile');

function getPackageIntents({dependencies}) {
  return Object.keys(dependencies).map(dep => dep + '@' + dependencies[dep]);
}

function getPackageNameFromIntent(intent) {
  return intent.substring(intent.lastIndexOf('@'), 0);
}

function getYarnDirectDependencies(packageJSON, yarnPackages) {
  return getPackageIntents(packageJSON).map(dependency => {
    return {
      name: getPackageNameFromIntent(dependency),
      version: yarnPackages[dependency].version
    }
  });
}

function resolveYarnDependency(dependencies, yarnPackages, path = '') {
  return dependencies.map(dep => {
    const dependency = yarnPackages[dep];
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
        result.children = resolveYarnDependency(getPackageIntents(dependency), yarnPackages, fullPath);
      }
    }
    return result;
  });
}

exports.getYarnDependencyTree = (packageJSON, yarnLock) => {
  const yarnPackages = lockfile.parse(yarnLock).object;
  const directDependencies = getPackageIntents(packageJSON);
  return resolveYarnDependency(directDependencies, yarnPackages);
};
