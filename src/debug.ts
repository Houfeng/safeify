import { Safeify } from './Safeify';
import * as vm from 'vm';

const log = require('debug')('debug');

(async function () {

  // log('vm.workerTotal', safeVm.workerTotal);
  const safeVm = new Safeify();
  const context = {
    a: 1, b: 2,
    add(a: number, b: number) {
      return a + b;
    }
  };

  console.time('测试1');
  try {
    const result1 = await safeVm.run(`return add(a,b)`, context);
    console.log('结果1', result1);
  } catch (err) {
    console.log('结果1', err.message);
  }
  console.timeEnd('测试1');

  // console.time('测试2');
  // try {
  //   const result2 = await vm.run('return 2+3');
  //   log('结果2', result2);
  // } catch (err) {
  //   log('结果2', err.message);
  // }
  // console.timeEnd('测试2');

  console.time('测试');
  const pendings = [];
  for (let i = 1; i < 500; i++) {
    pendings.push((async () => {
      const rs = await safeVm.run(`return add(1,${i})`, context);
      //console.log('结果', i, rs);
    })());
  }
  await Promise.all(pendings);
  console.timeEnd('测试');
  safeVm.distory();
  console.log('end', safeVm.workerTotal);

  // console.time('测试');
  // const pendings = [];
  // for (let i = 1; i < 1000; i++) {
  //   pendings.push((async () => {
  //     const context = vm.createContext({});
  //     const script = new vm.Script(`1+${i}`);
  //     const rs = script.runInContext(context);
  //     log('结果', i, rs);
  //   })());
  // }
  // await Promise.all(pendings);
  // console.timeEnd('测试');

  safeVm.distory();

})();