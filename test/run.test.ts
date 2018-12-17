import * as  assert from 'assert';
import { Safeify } from "../src";

const safeVm = new Safeify({
  timeout: 3000,
  asyncTimeout: 60000
});

const context = {
  a: 1,
  b: 2,
  system: {
    calc(a: number, b: number) {
      return (a + b);
    }
  }
};

describe('Safeify', function () {

  it('run', async function () {
    await safeVm.init();
    const result = await safeVm.run(`return system.calc(a,b)`, context)
    assert.equal(3, result);
  });

});