import { Safeify } from './Safeify';
import * as vm from 'vm';

const log = require('debug')('debug');
console.time('debug');

(async function () {

  const safeVm = new Safeify({
    timeout: Number.MAX_SAFE_INTEGER,
    asyncTimeout: Number.MAX_SAFE_INTEGER,
    quantity: 2
  });
  const context = {
    a: 1, b: 2,
    add(a: number, b: number) {
      return a + b;
    }
  };

  console.log('开始');
  console.time('测试');
  try {
    const result1 = await safeVm.run(`return add(1,2)`, context);
    const result2 = await safeVm.run(`return add(1,2)`, context);
    console.log('成功', result1);
  } catch (err) {
    console.log('失败', err.message);
  }
  console.timeEnd('测试');
  console.log('结束');

  safeVm.distory();

})();