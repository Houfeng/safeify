"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { isString } = require("ntils");
const callSymbol = "func://942ccb3b-a367-a650-9981-02e44a98a5e6/";
function createCallProxy(name) {
    if (isString(name)) {
        return callSymbol + name;
    }
    else {
        return callSymbol + name.join(".");
    }
}
exports.createCallProxy = createCallProxy;
function isCallProxy(value) {
    if (!isString(value))
        return false;
    return value.startsWith(callSymbol);
}
exports.isCallProxy = isCallProxy;
function getCallName(value) {
    return value.replace(callSymbol, "");
}
exports.getCallName = getCallName;
//# sourceMappingURL=Proxy.js.map