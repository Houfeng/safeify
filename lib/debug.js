"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log = require('debug')('debug');
console.time('debug');
(async function () {
    console.log('开始');
    console.time('测试');
    try {
        console.log('成功');
    }
    catch (err) {
        console.log('失败', err.stack);
    }
    console.timeEnd('测试');
    console.log('结束');
})();
//# sourceMappingURL=debug.js.map