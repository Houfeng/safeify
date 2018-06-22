"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Proxy_1 = require("./Proxy");
const IGNORE_PARAM = /^\_\_/;
const log = require('debug')('script');
const { newGuid, each, isFunction, isObject, isArray, isDate } = require('ntils');
function convertParams(sandbox, breadcrumb = []) {
    const result = Object.create(null);
    each(sandbox, (name, value) => {
        if (IGNORE_PARAM.test(name))
            return;
        if (isFunction(value)) {
            result[name] = Proxy_1.createCallProxy([...breadcrumb, name]);
        }
        else if (isObject(value) && !isArray(value) && !isDate(value)) {
            breadcrumb.push(name);
            result[name] = convertParams(value, breadcrumb);
        }
        else {
            result[name] = value;
        }
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
        this.params = convertParams(this.sandbox);
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