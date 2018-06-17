"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Safeify_1 = require("./Safeify");
const log = require('debug')('debug');
console.time('debug');
(async function () {
    const safeVm = new Safeify_1.Safeify({
        timeout: 3000,
        asyncTimeout: 300000,
        quantity: 2
    });
    await safeVm.init();
    const context = {
        a: 1, b: 2,
        add(a, b) {
            return a + b;
        }
    };
    console.log('开始');
    console.time('测试');
    try {
        const result1 = await safeVm.run(`return add(1,2)`, context);
        console.log('成功', result1);
    }
    catch (err) {
        console.log('失败', err.stack);
    }
    console.timeEnd('测试');
    console.log('结束');
    safeVm.distory();
})();
//# sourceMappingURL=debug.js.map