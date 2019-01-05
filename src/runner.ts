import { VM } from "vm2";
import { MessageType } from "./MessageType";
import { IMessage } from "./IMessage";
import { Script } from "./Script";
import { isCallProxy, getCallName } from "./Proxy";
import { Call } from "./Call";
import { IUnsafe } from "./IUnsafe";
import { IAlias } from "./IAlias";

const { each, isObject, isString, isArray, isDate } = require("ntils");

const pendingCalls: Call[] = [];

function wrapCode(code: string) {
  return `(async function(Buffer){${code}})(undefined)`;
}

function sendResult(message: any) {
  const pid = process.pid;
  const type = MessageType.done;
  const script = message.script;
  script.code = script.sandbox = null;
  process.send({ pid, type, ...message });
}

function createProxyFunc(scriptId: string, value: string) {
  const type = MessageType.call;
  const pid = process.pid;
  return (...args: any[]) => {
    const name = getCallName(value);
    const call = new Call({ name, args });
    pendingCalls.push(call);
    process.send({ pid, scriptId, type, call });
    return call.defer;
  };
}

function receiveCallRet(call: Call) {
  const pendingIndex = pendingCalls.findIndex(item => item.id === call.id);
  if (pendingIndex > -1) {
    const pendingCall = pendingCalls.splice(pendingIndex, 1)[0];
    if (pendingCall) {
      if (call.error) {
        pendingCall.reject(new Error(call.error));
      } else {
        pendingCall.resolve(call.result);
      }
    }
  }
}

function convertParams(scriptId: string, params: any) {
  const result = Object.create(null);
  each(params, (name: string, value: any) => {
    if (isCallProxy(value)) {
      result[name] = createProxyFunc(scriptId, value);
    } else if (isObject(value) && !isArray(value) && !isDate(value)) {
      result[name] = convertParams(scriptId, value);
    } else {
      result[name] = value;
    }
  });
  return result;
}

function attchUnsafe(sandbox: any, unsafe: IUnsafe) {
  const { require: req, modules = [] } = unsafe;
  if (req === false) return sandbox;
  const method = isString(req) ? <string>req : "require";
  sandbox[method] = (name: string) => {
    if (modules === true) return require(name);
    if (isArray(modules) && (<string[]>modules).includes(name)) {
      return require(name);
    }
    if ((<IAlias>modules)[name]) return require((<IAlias>modules)[name]);
    return null;
  };
}

async function run(script: Script) {
  const { timeout, code, params, unsafe } = script;
  const sandbox = convertParams(script.id, params);
  if (unsafe) attchUnsafe(sandbox, unsafe);
  const vm = new VM({ sandbox, timeout });
  try {
    script.result = await vm.run(wrapCode(code));
  } catch (err) {
    script.error = err.message;
  }
  sendResult({ script });
}

process.on("message", (message: IMessage) => {
  switch (message.type) {
    case MessageType.run:
      return run(message.script);
    case MessageType.ret:
      return receiveCallRet(message.call);
  }
});

// 发送 ready 消息
process.send({ type: MessageType.ready });
