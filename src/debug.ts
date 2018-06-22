import { Safeify } from './Safeify';
import * as vm from 'vm';

const log = require('debug')('debug');
console.time('debug');

(async function () {

  const safeVm = new Safeify({
    timeout: 3000,
    asyncTimeout: 300000,
    quantity: 2
  });
  await safeVm.init();
  const context = {
    a: 1, b: 2,
    system: {
      add(a: number, b: number) {
        return (a + b) * 2;
      }
    }
  };

  console.log('开始');
  console.time('测试');
  try {
    const result1 = await safeVm.run(`return system.add(1,2)`, context);
    console.log('成功', result1);
  } catch (err) {
    console.log('失败', err.stack);
  }
  console.timeEnd('测试');
  console.log('结束');

  safeVm.distory();

})();