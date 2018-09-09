# deparser [![Build Status](https://travis-ci.org/monshi/deparser.svg?branch=master)](https://travis-ci.org/monshi/deparser)
Parse package manager lock files (for now yarn.lock) to generate dependency graph.

## Usage
Import Deparser library into your code,
and then instantiate with path to `package.json` and `yarn.lock`.
Start using the methods on your instance.

```
const Deparser = require('Deparser');
const deparser = new Deparser();

const dependencyTree = deparser.getDependencyTree();
const directDependencies = deparser.getDirectDependencies();
const intents = deparser.getAllIntents();
```

## Example
[package.json](https://github.com/monshi/deparser/blob/master/test/fixture/package.json):
```
{
  "dependencies": {
    "moment": "^2.22.2",
    "react": "^16.4.2"
  },
  "devDependencies": {
    "mocha": "^5.2.0"
  },
  "optionalDependencies": {
    "fsevents": "^1.2.4"
  }
}
```

[yarn.lock](https://github.com/monshi/deparser/blob/master/test/fixture/yarn.lock):

Result of dependency tree from the above `package.json` and `yarn.lock` is [tree.json](https://github.com/monshi/deparser/blob/master/test/fixture/tree.json):
```
[
  {
    "name": "moment",
    "version": "2.22.2",
    "type": "dependencies"
  },
  {
    "name": "react",
    "version": "16.4.2",
    "type": "dependencies",
    "children": [...]
  },
  {
    "name": "mocha",
    "version": "5.2.0",
    "type": "devDependencies",
    "children": [...]
  },
  {
    "name": "fsevents",
    "version": "1.2.4",
    "type": "optionalDependencies",
    "children": [...]
  }
]
```
