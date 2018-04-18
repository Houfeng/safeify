"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Proxy_1 = require("./Proxy");
const log = require('debug')('script');
const { newGuid, each, isFunction } = require('ntils');
function createParams(sandbox) {
    const result = Object.assign({}, sandbox);
    each(result, (name, value) => {
        result[name] = isFunction(value) ? Proxy_1.createProxy() : value;
    });
    return result;
}
class Script {
    constructor(options) {
        Object.assign(this, options);
        this.id = newGuid();
        if (!this.code)
            this.code = '';
        if (!this.sandbox)
            this.sandbox = {};
        this.params = createParams(this.sandbox);
        this.defer = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
    toJSON() {
        const { id, code, result, error, timeout, asyncTimeout, params } = this;
        return { id, code, result, error, timeout, asyncTimeout, params };
    }
}
exports.Script = Script;
//# sourceMappingURL=Script.js.map