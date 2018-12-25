import * as  assert from 'assert';
import { Safeify } from "../src";

const context = {
  a: 1,
  b: 2,
  __ignore: 1,
  getTime: function () {
    return 2;
  },
  error: function () {
    throw new Error('this is a error')
  },
  system: {
    calc(a: number, b: number, time: number) {
      return (a + b) * (time || 1);
    },
    get(a: number) {
      return new Promise(resolve => setTimeout(() => resolve(a), 100));
    }
  }
};

describe('Safeify', function () {

  it('run: success', async function () {
    const safeVm = new Safeify({
      timeout: 500,
      asyncTimeout: 5000,
      unrestricted: true
    });
    await safeVm.init();
    const result = await safeVm.run(
      `return system.calc(a,b, await getTime())`, context
    );
    await safeVm.distory();
    assert.equal(6, result);
  });

  it('run: error', async function () {
    const safeVm = new Safeify({
      timeout: 500,
      asyncTimeout: 5000,
      unrestricted: true
    });
    await safeVm.init();
    let error;
    try {
      await safeVm.run(`return system.calc(a,d)`, context);
    } catch (err) {
      error = err.message;
    }
    await safeVm.distory();
    assert.equal('d is not defined', error);
  });


  it('run: call error', async function () {
    const safeVm = new Safeify({
      timeout: 500,
      asyncTimeout: 5000,
      unrestricted: true
    });
    await safeVm.init();
    let error;
    try {
      await safeVm.run(`return error()`, context);
    } catch (err) {
      error = err.message;
    }
    await safeVm.distory();
    assert.equal('this is a error', error);
  });

  it('run: sync timeout', async function () {
    const safeVm = new Safeify({
      timeout: 500,
      asyncTimeout: 5000,
      unrestricted: true
    });
    await safeVm.init();
    let error;
    try {
      await safeVm.run(`while(true);`, context);
    } catch (err) {
      error = err.message;
    }
    await safeVm.distory();
    assert.equal('Script execution timed out.', error);
  });

  it('run: async timeout', async function () {
    const safeVm = new Safeify({
      timeout: 500,
      asyncTimeout: 500,
      unrestricted: true
    });
    await safeVm.init();
    let error;
    try {
      await safeVm.run(`return new Promise(()=>{})`, context);
    } catch (err) {
      error = err.message;
    }
    await safeVm.distory();
    assert.equal('Script execution timed out.', error);
  });


  it('run: ignore', async function () {
    const safeVm = new Safeify({
      timeout: 500,
      asyncTimeout: 5000,
      unrestricted: true
    });
    await safeVm.init();
    let error;
    try {
      await safeVm.run(`return __ignore`, context);
    } catch (err) {
      error = err.message;
    }
    await safeVm.distory();
    assert.equal('__ignore is not defined', error);
  });

  it('run: blank', async function () {
    const safeVm = new Safeify({
      timeout: 500,
      asyncTimeout: 5000,
      unrestricted: true
    });
    await safeVm.init();
    const result = await safeVm.run('');
    await safeVm.distory();
    assert.equal(undefined, result);
  });

  it('run: function', async function () {
    const safeVm = new Safeify({
      timeout: 500,
      asyncTimeout: 5000,
      unrestricted: true
    });
    await safeVm.init();
    const result = await safeVm.run(function (system: any) {
      return system.calc(1, 2);
    }, context);
    await safeVm.distory();
    assert.equal(3, result);
  });

  it('run: preset', async function () {
    const safeVm = new Safeify({
      timeout: 500,
      asyncTimeout: 5000,
      unrestricted: true
    });
    await safeVm.init();
    safeVm.preset(function (system: any) {
      const calc = system.calc;
    });
    const result = await safeVm.run(`return calc(1,2)`, context);
    await safeVm.distory();
    assert.equal(3, result);
  });

  it('run: worker', async function () {
    const safeVm = new Safeify({
      timeout: 500,
      asyncTimeout: 5000,
      unrestricted: true,
      quantity: 1,
    });
    await safeVm.init();
    assert.equal(2, safeVm.workerTotal);
    assert.equal(0, safeVm.pendingTotal);
    assert.equal(0, safeVm.runningTotal);
    const result = await safeVm.run(function (system: any) {
      return system.get(1);
    }, context);
    await safeVm.distory();
    assert.equal(1, result);
    assert.equal(0, safeVm.runningTotal);
  });

  it('run: loop in micro-task', async function () {
    const safeVm = new Safeify({
      timeout: 500,
      asyncTimeout: 500,
      unrestricted: true
    });
    await safeVm.init();
    let error;
    try {
      await safeVm.run(`return Promise.resolve().then(()=>{while(true);})`, context);
    } catch (err) {
      error = err.message;
    }
    await safeVm.distory();
    assert.equal('Script execution timed out.', error);
  });

});