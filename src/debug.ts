import { Safeify } from './Safeify';
import * as vm from 'vm';

const log = require('debug')('debug');
console.time('debug');

(async function () {

  const safeVm = new Safeify({
    timeout: 3000,
    asyncTimeout: 100000,
  });

  await safeVm.init();

  const context = {
    a: 1, b: 2,
    system: {
      add(a: number, b: number) {
        return (a + b) * 2;
      }
    },
  };

  console.log('开始');
  console.time('测试');
  try {
    await Promise.all(new Array(50000).fill(1)
      .map(() => safeVm.run(`return system.add(1,2)`, context)));
    console.log('成功');
  } catch (err) {
    console.log('失败', err.stack);
  }
  console.timeEnd('测试');
  console.log('结束');

  safeVm.distory();

})();