import * as os from 'os';
import * as childProcess from 'child_process';
import { ISafeifyOptions } from './ISafeifyOptions';
import { CGroups } from './CGroups';
import { IWorker } from './IWorker';
import { MessageType } from './MessageType';
import { IMessage } from './IMessage';
import { Script } from './Script';
import { WorkerState } from './WorkerState';

const { isFunction, getByPath } = require('ntils');
const log = require('debug')('safeify');

const timeout = 1000;
const asyncTimeout = 60000;
const cpuQuota = 0.5;
const memoryQuota = 500;
const cpuCount = os.cpus().length;
const quantity = cpuCount > 1 ? cpuCount : cpuCount * 2;
const runnerFile = require.resolve('./runner');
const sandbox = Object.create(null);

export class Safeify {

  private options: ISafeifyOptions = {};
  private workers: Array<IWorker> = [];
  private pendingScripts: Array<Script> = [];
  private runningScripts: Array<Script> = [];
  private cgroups: CGroups = null;
  private inited: boolean = false;
  private presets: Array<string> = [];

  constructor(opts: ISafeifyOptions = {}) {
    Object.assign(this.options, {
      timeout, asyncTimeout, quantity, sandbox, cpuQuota, memoryQuota
    }, opts);
  }

  public async init() {
    if (this.inited) return;
    this.inited = true;
    const { unrestricted } = this.options;
    if (!unrestricted) await this.createControlGroup();
    await this.createWorkers();
  }

  public distory = () => {
    this.workers.forEach(item => {
      item.process.removeAllListeners('message');
      item.process.removeAllListeners('disconnect');
      if (!item.process.killed) item.process.kill();
    });
    this.workers = [];
  }

  get workerTotal() {
    return this.workers.length;
  }

  get pendingTotal() {
    return this.pendingScripts.length;
  }

  get runningTotal() {
    return this.runningScripts.length;
  }

  private async onWokerCall(message: IMessage) {
    const { call, pid, scriptId } = message;
    if (!call) return;
    const script = this.runningScripts.find(item => item.id == scriptId);
    if (!script) return;
    try {
      const breadcrumb = call.name.split('.');
      const name = breadcrumb.pop();
      const context = getByPath(script.sandbox, breadcrumb) || sandbox;
      call.result = await context[name](...call.args);
    } catch (err) {
      call.error = err.message;
    }
    const worker = this.workers.find(item => item.process.pid == pid);
    if (!worker) return;
    const type = MessageType.ret;
    worker.process.send({ type, call });
  }

  private onWorkerMessage = (message: IMessage) => {
    switch (message.type) {
      case MessageType.done:
        return this.onWorkerDone(message);
      case MessageType.call:
        return this.onWokerCall(message);
    }
  }

  private onWorkerDone(message: IMessage) {
    const { pid, script, healthy } = message;
    const worker = this.workers.find(item => item.process.pid == pid);
    if (worker && healthy) worker.stats--;
    if (worker && !healthy) {
      worker.state = WorkerState.unhealthy;
      setTimeout(() => {
        if (worker.process.connected) worker.process.disconnect();
        if (!worker.process.killed) worker.process.kill();
      }, this.options.asyncTimeout + 1000);
    }
    if (this.pendingScripts.length > 0) this.execute();
    //处理执行完的脚本
    const runningIndex = this.runningScripts
      .findIndex(item => item.id === script.id);
    if (runningIndex < 0) return;
    const runningScript = this.runningScripts.splice(runningIndex, 1)[0];
    if (!runningScript) return;
    if (script.error) {
      runningScript.reject(new Error(script.error), pid);
      log('onWorkerDone error', script.id, script.error);
    } else {
      runningScript.resolve(script.result, pid);
      log('onWorkerDone result', script.id, script.result);
    }
  }

  private onWorkerDisconnect = async () => {
    log('onWorkerDisconnect', 'pendingScripts', this.pendingScripts.length);
    this.workers = this.workers.filter(item => item.process.connected);
    await this.createWorkers();
    if (this.pendingScripts.length > 0) this.execute();
  }

  private createControlGroup() {
    this.cgroups = new CGroups('safeify');
    const { cpuQuota, memoryQuota } = this.options;
    return this.cgroups.set({
      cpu: { cfs_quota_us: 100000 * cpuQuota },
      memory: { limit_in_bytes: 1048576 * memoryQuota }
    });
  }

  private async createWorker(): Promise<IWorker> {
    const { unrestricted } = this.options;
    const workerProcess = childProcess.fork(runnerFile);
    if (!unrestricted) await this.cgroups.addProcess(workerProcess.pid);
    return new Promise<IWorker>((resolve) => {
      workerProcess.once('message', (message: IMessage) => {
        if (!message || message.type !== MessageType.ready) return;
        workerProcess.on('message', this.onWorkerMessage);
        workerProcess.on('disconnect', this.onWorkerDisconnect);
        const stats = 0, state = WorkerState.healthy;
        resolve({ process: workerProcess, stats, state });
      });
    });
  }

  private get healthyWorkers() {
    return this.workers.filter(
      worker => worker.process.connected && worker.state == WorkerState.healthy
    );
  }

  private async createWorkers() {
    const num = this.options.quantity - this.healthyWorkers.length;
    const workers = [];
    for (let i = 0; i < num; i++) {
      workers.push((async () => {
        const worker = await this.createWorker();
        this.workers.push(worker);
        return worker;
      })());
    }
    return Promise.all(workers);
  }

  private execute() {
    const worker = this.healthyWorkers.sort((a, b) => a.stats - b.stats)[0];
    if (!worker) return;
    log('execute pid', worker.process.pid);
    const script = this.pendingScripts.shift();
    if (!script) return;
    worker.stats++;
    this.runningScripts.push(script);
    log('execute code', script.code);
    worker.process.send({ type: MessageType.run, script: script });
  }

  private toCode(code: string | Function): string {
    if (!code) return ';';
    if (isFunction(code)) {
      const result = /\{([\s\S]*)\}/.exec(code.toString());
      return result[1] || '';
    } else {
      return code.toString();
    }
  }

  public preset(code: string | Function) {
    this.presets.push(this.toCode(code));
  }

  public async run(code: string | Function, sandbox?: any) {
    await this.init();
    code = [...this.presets, this.toCode(code), os.EOL].join(';');
    log('run', code);
    const { timeout, asyncTimeout } = this.options;
    const script = new Script({ code, timeout, asyncTimeout, sandbox });
    this.pendingScripts.push(script);
    this.execute();
    return script.defer;
  }

}