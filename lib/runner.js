"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vm2_1 = require("vm2");
const MessageType_1 = require("./MessageType");
const Proxy_1 = require("./Proxy");
const Call_1 = require("./Call");
const { each, isObject, isArray, isDate } = require('ntils');
const pendingCalls = [];
function wrapCode(code) {
    return `(async function(Buffer){${code}})(undefined)`;
}
function sendResult(message) {
    const pid = process.pid;
    const type = MessageType_1.MessageType.done;
    const script = message.script;
    script.code = script.sandbox = null;
    process.send(Object.assign({ pid, type }, message));
}
function createProxyFunc(scriptId, value) {
    const type = MessageType_1.MessageType.call;
    const pid = process.pid;
    return (...args) => {
        const name = Proxy_1.getCallName(value);
        const call = new Call_1.Call({ name, args });
        pendingCalls.push(call);
        process.send({ pid, scriptId, type, call });
        return call.defer;
    };
}
function receiveCallRet(call) {
    const pendingIndex = pendingCalls.findIndex(item => item.id === call.id);
    if (pendingIndex > -1) {
        const pendingCall = pendingCalls.splice(pendingIndex, 1)[0];
        if (pendingCall) {
            if (call.error) {
                pendingCall.reject(new Error(call.error));
            }
            else {
                pendingCall.resolve(call.result);
            }
        }
    }
}
function convertParams(scriptId, params) {
    const result = Object.create(null);
    each(params, (name, value) => {
        if (Proxy_1.isCallProxy(value)) {
            result[name] = createProxyFunc(scriptId, value);
        }
        else if (isObject(value) && !isArray(value) && !isDate(value)) {
            result[name] = convertParams(scriptId, value);
        }
        else {
            result[name] = value;
        }
    });
    return result;
}
async function run(script) {
    const { timeout, asyncTimeout, code, params } = script;
    const sandbox = convertParams(script.id, params);
    const vm = new vm2_1.VM({ sandbox, timeout });
    const timeoutTimer = setTimeout(() => {
        script.error = 'Script timeout';
        sendResult({ script, healthy: false });
    }, asyncTimeout);
    try {
        script.result = await vm.run(wrapCode(code));
    }
    catch (err) {
        script.error = err.message;
    }
    clearTimeout(timeoutTimer);
    sendResult({ script, healthy: true });
}
process.on('message', (message) => {
    switch (message.type) {
        case MessageType_1.MessageType.run:
            return run(message.script);
        case MessageType_1.MessageType.ret:
            return receiveCallRet(message.call);
    }
});
//# sourceMappingURL=runner.js.map