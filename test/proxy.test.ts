import * as  assert from 'assert';
import { createCallProxy } from "../src/Proxy";

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

});