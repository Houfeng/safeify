import * as  assert from 'assert';
import { createCallProxy, isCallProxy } from "../src/Proxy";

describe('Proxy', function () {

  it('createCallProxy: string', async function () {
    const proxySymbol = createCallProxy('test')
    assert.equal(proxySymbol,
      'func://942ccb3b-a367-a650-9981-02e44a98a5e6/test');
  });

  it('createCallProxy: array', async function () {
    const proxySymbol = createCallProxy(['test', 'test'])
    assert.equal(proxySymbol,
      'func://942ccb3b-a367-a650-9981-02e44a98a5e6/test.test');
  });

  it('isCallProxy: true', async function () {
    const result = isCallProxy(
      'func://942ccb3b-a367-a650-9981-02e44a98a5e6/test.test'
    )
    assert.equal(result, true);
  });

  it('isCallProxy: false1', async function () {
    const result = isCallProxy('test')
    assert.equal(result, false);
  });

  it('isCallProxy: false2', async function () {
    const result = isCallProxy({})
    assert.equal(result, false);
  });

});