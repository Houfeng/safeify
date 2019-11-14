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
    await safeVm.destroy();
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
    await safeVm.destroy();
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
    await safeVm.destroy();
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
    await safeVm.destroy();
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
    await safeVm.destroy();
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
    await safeVm.destroy();
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
    await safeVm.destroy();
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
    await safeVm.destroy();
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
    await safeVm.destroy();
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
    await safeVm.destroy();
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
      await safeVm.run(
        `return Promise.resolve().then(()=>{while(true);})`, context
      );
    } catch (err) {
      error = err.message;
    }
    await safeVm.destroy();
    assert.equal('Script execution timed out.', error);
  });

  it('run: unsafe named', async function () {
    const safeVm = new Safeify({
      timeout: 500,
      asyncTimeout: 500,
      unrestricted: true,
      unsafe: {
        require: 'xxx',
        modules: ['ntils']
      }
    });
    await safeVm.init();
    let result
    try {
      result = await safeVm.run(`return xxx('ntils').isNumber(1)`, context);
    } catch (err) {
      console.log(err.message);
    }
    await safeVm.destroy();
    assert.equal(1, result);
  });

  it('run: unsafe default', async function () {
    const safeVm = new Safeify({
      timeout: 500,
      asyncTimeout: 500,
      unrestricted: true,
      unsafe: {
        modules: ['ntils']
      }
    });
    await safeVm.init();
    let result
    try {
      result = await safeVm.run(`return require('ntils').isNumber(1)`, context);
    } catch (err) {
      console.log(err.message);
    }
    await safeVm.destroy();
    assert.equal(1, result);
  });

  it('run: unsafe error', async function () {
    const safeVm = new Safeify({
      timeout: 500,
      asyncTimeout: 500,
      unrestricted: true,
      unsafe: {
        modules: []
      }
    });
    await safeVm.init();
    let error
    try {
      await safeVm.run(`return require('ntils').isNumber(1)`, context);
    } catch (err) {
      error = err.message;
    }
    await safeVm.destroy();
    assert.equal('Cannot read property \'isNumber\' of null', error);
  });

  it('run: unsafe any modules', async function () {
    const safeVm = new Safeify({
      timeout: 500,
      asyncTimeout: 500,
      unrestricted: true,
      unsafe: {
        modules: true
      }
    });
    await safeVm.init();
    let result
    try {
      result = await safeVm.run(`return require('ntils').isNumber(1)`, context);
    } catch (err) {
      console.log(err.message);
    }
    await safeVm.destroy();
    assert.equal(1, result);
  });

  it('run: unsafe by alias', async function () {
    const safeVm = new Safeify({
      timeout: 500,
      asyncTimeout: 500,
      unrestricted: true,
      unsafe: {
        modules: {
          'n': 'ntils'
        }
      }
    });
    await safeVm.init();
    let result
    try {
      result = await safeVm.run(`return require('n').isNumber(1)`, context);
    } catch (err) {
      console.log(err.message);
    }
    await safeVm.destroy();
    assert.equal(1, result);
  });

  it('run: evoke new workers', async function () {
    const safeVm = new Safeify({
      timeout: 3000,
      asyncTimeout: 3000,
      unrestricted: true,
      workers: 2,
    });
    await safeVm.init();
    let result
    try {
      await safeVm.run(`return new Promise(()=>{})`, context);
      await safeVm.run(`return new Promise(()=>{})`, context);
      await safeVm.run(`return new Promise(()=>{})`, context);
    } catch{ }
    assert.equal(2, safeVm.workerTotal);
    try {
      result = await safeVm.run(`return true`, context);
    } catch (err) {
      console.log(err.message);
    }
    assert.equal(2, safeVm.workerTotal);
    await safeVm.destroy();
    assert.equal(true, result);
  });

});