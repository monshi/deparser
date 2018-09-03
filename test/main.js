const {expect, assert} = require('chai');
const Deparser = require('../lib/Deparser');
const treeJSON = require('./fixture/tree.json');

// Test suite
describe('Basic tests', () => {
  const deparserInstance = new Deparser('test/fixture/package.json', 'test/fixture/yarn.lock');

  it('Direct dependency test', () => {
    const directs = deparserInstance.getDirectDependencies();
    expect(directs).to.have.lengthOf(treeJSON.length);
    expect(directs[0].name).to.equal(treeJSON[0].name);
    expect(directs[0].version).to.equal(treeJSON[0].version);
    expect(directs[1].name).to.equal(treeJSON[1].name);
    expect(directs[1].version).to.equal(treeJSON[1].version);
    expect(directs[1].version).to.equal(treeJSON[1].version);
  });

  it('Full dependency tree test', () => {
    const dependencyTree = deparserInstance.getDependencyTree();
    assert.deepEqual(dependencyTree, treeJSON);
  });

  it('Package.json intents test', () => {
    const intents = deparserInstance.getIntents();
    expect(intents).to.have.lengthOf(2);
    expect(intents[0]).to.equal('moment@^2.22.2');
    expect(intents[1]).to.equal('react@^16.4.2');
  });
});