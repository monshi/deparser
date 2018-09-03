# deparser
Parse package manager lock files (for now yarn.lock) to generate dependency graph.

## Usage
Import Deparser library into your code,
and then instantiate with path to `package.json` and `yarn.lock`.
Start using the methods on your instance.

```
const Deparser = require('Deparser');

const packageJSONPath = './dependencies/package.json';
const yarnLockPath = './dependencies/yarn.lock';
const deparser = new Deparser(packageJSONPath, yarnLockPath);

const dependencyTree = deparser.getDependencyTree();
const directDependencies = deparser.getDirectDependencies();
const intents = deparser.getIntents();
```

## Example
[package.json](https://github.com/monshi/deparser/blob/master/test/fixture/package.json):
```
{
  "dependencies": {
    "moment": "^2.22.2",
    "react": "^16.4.2"
  }
}
```

[yarn.lock](https://github.com/monshi/deparser/blob/master/test/fixture/yarn.lock):

Result of dependency tree from the above `package.json` and `yarn.lock` is [tree.json](https://github.com/monshi/deparser/blob/master/test/fixture/tree.json):
```
[
  {
    "name": "moment",
    "version": "2.22.2"
  },
  {
    "name": "react",
    "version": "16.4.2",
    "children": [
      {
        "name": "fbjs",
        "version": "0.8.17",
        "children": [
          {
            "name": "core-js",
            "version": "1.2.7"
          },
          {
            "name": "isomorphic-fetch",
            "version": "2.2.1",
            "children": [
              {
                "name": "node-fetch",
                "version": "1.7.3",
                "children": [
                  {
                    "name": "encoding",
                    "version": "0.1.12",
                    "children": [
                      {
                        "name": "iconv-lite",
                        "version": "0.4.23",
                        "children": [
                          {
                            "name": "safer-buffer",
                            "version": "2.1.2"
                          }
                        ]
                      }
                    ]
                  },
                  {
                    "name": "is-stream",
                    "version": "1.1.0"
                  }
                ]
              },
              {
                "name": "whatwg-fetch",
                "version": "2.0.4"
              }
            ]
          },
          {
            "name": "loose-envify",
            "version": "1.4.0",
            "children": [
              {
                "name": "js-tokens",
                "version": "4.0.0"
              }
            ]
          },
          {
            "name": "object-assign",
            "version": "4.1.1"
          },
          {
            "name": "promise",
            "version": "7.3.1",
            "children": [
              {
                "name": "asap",
                "version": "2.0.6"
              }
            ]
          },
          {
            "name": "setimmediate",
            "version": "1.0.5"
          },
          {
            "name": "ua-parser-js",
            "version": "0.7.18"
          }
        ]
      },
      {
        "name": "loose-envify",
        "version": "1.4.0",
        "children": [
          {
            "name": "js-tokens",
            "version": "4.0.0"
          }
        ]
      },
      {
        "name": "object-assign",
        "version": "4.1.1"
      },
      {
        "name": "prop-types",
        "version": "15.6.2",
        "children": [
          {
            "name": "loose-envify",
            "version": "1.4.0",
            "children": [
              {
                "name": "js-tokens",
                "version": "4.0.0"
              }
            ]
          },
          {
            "name": "object-assign",
            "version": "4.1.1"
          }
        ]
      }
    ]
  }
]
```
