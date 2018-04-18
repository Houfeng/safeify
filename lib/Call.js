"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log = require('debug')('Call');
const { newGuid } = require('ntils');
class Call {
    constructor(options) {
        Object.assign(this, options);
        this.id = newGuid();
        this.defer = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
    toJSON() {
        const { id, name, args, result, error } = this;
        return { id, name, args, result, error };
    }
}
exports.Call = Call;
//# sourceMappingURL=Call.js.map