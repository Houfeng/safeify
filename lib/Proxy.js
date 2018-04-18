"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const proxySymbol = 'proxy://942ccb3b-a367-a650-9981-02e44a98a5e6';
function createProxy() {
    return proxySymbol;
}
exports.createProxy = createProxy;
function isProxy(value) {
    return value == proxySymbol;
}
exports.isProxy = isProxy;
//# sourceMappingURL=Proxy.js.map