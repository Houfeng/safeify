import { Safeify } from "./Safeify";

console.time("debug");

(async () => {
  console.log("初始化");
  const safeVm = new Safeify({
    timeout: 1000,
    asyncTimeout: 3000
  });

  await safeVm.init();

  console.log("workers", safeVm.workerTotal);

  const context = {
    a: 1,
    b: 2,
    system: {
      add(a: number, b: number) {
        // return new Promise(() => {});
        return (a + b) * 2;
      }
    }
  };

  console.time("测试");
  try {
    await Promise.all(
      new Array(1)
        .fill(1)
        .map(() => safeVm.run(`return system.add(1,2)`, context))
    );
    console.log("成功");
  } catch (err) {
    console.log("失败", err.stack);
  }
  console.timeEnd("测试");
  safeVm.destroy();
  console.log("结束");
})();
