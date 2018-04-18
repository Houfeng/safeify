"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vm2_1 = require("vm2");
const MessageType_1 = require("./MessageType");
const Proxy_1 = require("./Proxy");
const Call_1 = require("./Call");
const { each } = require('ntils');
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
function createProxyFunc(scriptId, name) {
    const type = MessageType_1.MessageType.call;
    const pid = process.pid;
    return (...args) => {
        const call = new Call_1.Call({ name, args });
        pendingCalls.push(call);
        process.send({ pid, scriptId, type, call });
        return call.defer;
    };
}
function receiveProxyRet(call) {
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
function wrapParams(scriptId, params) {
    const result = Object.create(null);
    each(params, (name, value) => {
        result[name] = Proxy_1.isProxy(value) ? createProxyFunc(scriptId, name) : value;
    });
    return result;
}
async function run(script) {
    const { timeout, asyncTimeout, code, params } = script;
    const sandbox = wrapParams(script.id, params);
    const vm = new vm2_1.VM({ sandbox, timeout });
    let done = false;
    setTimeout(() => {
        if (done)
            return;
        script.error = 'Script timeout';
        sendResult({ script, willExit: true });
        process.disconnect();
        process.exit(0);
    }, asyncTimeout);
    try {
        script.result = await vm.run(wrapCode(code));
    }
    catch (err) {
        script.error = err.message;
    }
    done = true;
    sendResult({ script });
}
process.on('message', (message) => {
    switch (message.type) {
        case MessageType_1.MessageType.run:
            return run(message.script);
        case MessageType_1.MessageType.ret:
            return receiveProxyRet(message.call);
    }
});
//# sourceMappingURL=runner.js.map