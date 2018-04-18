import { VM } from 'vm2';
import { MessageType } from './MessageType';
import { IMessage } from './IMessage';
import { Script } from './Script';
import { isProxy } from './Proxy';
import { Call } from './Call';

const { each } = require('ntils');

const pendingCalls: Array<Call> = [];

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

function createProxyFunc(scriptId: string, name: string) {
  const type = MessageType.call;
  const pid = process.pid;
  return (...args: Array<any>) => {
    const call = new Call({ name, args });
    pendingCalls.push(call);
    process.send({ pid, scriptId, type, call });
    return call.defer;
  };
}

function receiveProxyRet(call: Call) {
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

function wrapParams(scriptId: string, params: any) {
  const result = Object.create(null);
  each(params, (name: string, value: any) => {
    result[name] = isProxy(value) ? createProxyFunc(scriptId, name) : value;
  });
  return result;
}

async function run(script: Script) {
  const { timeout, asyncTimeout, code, params } = script;
  const sandbox = wrapParams(script.id, params);
  const vm = new VM({ sandbox, timeout });
  let done = false;
  setTimeout(() => {
    if (done) return;
    script.error = 'Script timeout';
    sendResult({ script, willExit: true });
    process.disconnect();
    process.exit(0);
  }, asyncTimeout);
  try {
    script.result = await vm.run(wrapCode(code));
  } catch (err) {
    script.error = err.message;
  }
  done = true;
  sendResult({ script });
}

process.on('message', (message: IMessage) => {
  switch (message.type) {
    case MessageType.run:
      return run(message.script);
    case MessageType.ret:
      return receiveProxyRet(message.call);
  }
});