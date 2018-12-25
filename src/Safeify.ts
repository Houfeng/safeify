import * as os from "os";
import * as childProcess from "child_process";
import { ISafeifyOptions } from "./ISafeifyOptions";
import { CGroups } from "./CGroups";
import { Worker } from "./Worker";
import { MessageType } from "./MessageType";
import { IMessage } from "./IMessage";
import { Script } from "./Script";
import { WorkerState } from "./WorkerState";

const { isFunction, getByPath } = require("ntils");
const log = require("debug")("safeify");

const defaultSandbox = Object.create(null);
const defaultOptions = {
  timeout: 1000,
  asyncTimeout: 60000,
  quantity: os.cpus().length,
  sandbox: defaultSandbox,
  cpuQuota: 0.5,
  memoryQuota: 500
};
const runnerFile = require.resolve("./runner");
/* istanbul ignore next */
const childExecArgv = (process.execArgv || []).map(flag =>
  flag.includes("--inspect") ? "--inspect=0" : flag
);
const instances: Safeify[] = [];

process.once("exit", () => {
  instances.forEach(instance => instance.distory());
});

export class Safeify {
  private options: ISafeifyOptions = {};
  private workers: Worker[] = [];
  private pendingScripts: Script[] = [];
  private cgroups: CGroups = null;
  private inited = false;
  private presets: string[] = [];

  constructor(opts: ISafeifyOptions = {}) {
    instances.push(this);
    Object.assign(this.options, defaultOptions, opts);
    if (this.options.quantity < 2) this.options.quantity = 2;
  }

  public async init() {
    /* istanbul ignore if */
    if (this.inited) return;
    this.inited = true;
    const { unrestricted } = this.options;
    /* istanbul ignore if */
    if (!unrestricted) await this.createControlGroup();
    await this.createWorkers();
  }

  public distory = () => {
    const index = instances.indexOf(this);
    if (index > -1) instances.splice(index, 1);
    this.workers.forEach(worker => this.distoryWorker(worker));
    this.workers = [];
  };

  private distoryWorker(worker: Worker) {
    worker.state = WorkerState.unhealthy;
    worker.runningScripts.forEach(script => script.stop());
    worker.process.removeAllListeners("message");
    worker.process.removeAllListeners("disconnect");
    if (worker.process.connected) worker.process.disconnect();
    if (!worker.process.killed) worker.process.kill("SIGKILL");
  }

  get workerTotal() {
    return this.workers.length;
  }

  get pendingTotal() {
    return this.pendingScripts.length;
  }

  get runningTotal() {
    return this.workers.reduce((count, worker: Worker) => {
      return count + worker.runningScripts.length;
    }, 0);
  }

  private async onWokerCall(message: IMessage) {
    const { call, pid, scriptId } = message;
    /* istanbul ignore if */
    if (!call) return;
    const worker = this.workers.find(item => item.process.pid === pid);
    /* istanbul ignore if */
    if (!worker) return;
    const script = worker.runningScripts.find(item => item.id === scriptId);
    /* istanbul ignore if */
    if (!script) return;
    try {
      const breadcrumb = call.name.split(".");
      const name = breadcrumb.pop();
      const context = getByPath(script.sandbox, breadcrumb) || defaultSandbox;
      call.result = await context[name](...call.args);
    } catch (err) {
      call.error = err.message;
    }
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
  };

  private onWorkerDone(message: IMessage) {
    const { pid, script } = message;
    const worker = this.workers.find(item => item.process.pid === pid);
    this.handleScriptDone(worker, script, false);
  }

  private handleScriptDone(worker: Worker, script: any, kill: boolean) {
    if (!worker || !script) return;
    if (kill) {
      this.distoryWorker(worker);
    } else {
      worker.stats--;
    }
    if (this.pendingScripts.length > 0) this.execute();
    this.handleScriptResult(worker, script);
  }

  private handleScriptResult(worker: Worker, script: Script) {
    const runningIndex = worker.runningScripts.findIndex(
      item => item.id === script.id
    );
    /* istanbul ignore if */
    if (runningIndex < 0) return;
    const runningScript = worker.runningScripts.splice(runningIndex, 1)[0];
    /* istanbul ignore if */
    if (!runningScript) return;
    runningScript.stop();
    if (script.error) {
      runningScript.reject(new Error(script.error));
      log("onWorkerDone error", script.id, script.error);
    } else {
      runningScript.resolve(script.result);
      log("onWorkerDone result", script.id, script.result);
    }
  }

  /* istanbul ignore next */
  private onWorkerDisconnect = async () => {
    log("onWorkerDisconnect", "pendingScripts", this.pendingScripts.length);
    this.workers = this.workers.filter(item => item.process.connected);
    await this.createWorkers();
    if (this.pendingScripts.length > 0) this.execute();
  };

  private createControlGroup() {
    this.cgroups = new CGroups("safeify");
    const { cpuQuota, memoryQuota } = this.options;
    return this.cgroups.set({
      cpu: { cfs_quota_us: 100000 * cpuQuota },
      memory: { limit_in_bytes: 1048576 * memoryQuota }
    });
  }

  private async createWorker(): Promise<Worker> {
    const { unrestricted } = this.options;
    const workerProcess = childProcess.fork(runnerFile, [], {
      execArgv: childExecArgv
    });
    if (!unrestricted) await this.cgroups.addProcess(workerProcess.pid);
    return new Promise<Worker>(resolve => {
      workerProcess.once("message", (message: IMessage) => {
        /* istanbul ignore if */
        if (!message || message.type !== MessageType.ready) return;
        workerProcess.on("message", this.onWorkerMessage);
        workerProcess.on("disconnect", this.onWorkerDisconnect);
        resolve(new Worker(workerProcess));
      });
    });
  }

  private get healthyWorkers() {
    return this.workers.filter(
      worker => worker.process.connected && worker.state === WorkerState.healthy
    );
  }

  private async createWorkers() {
    const num = this.options.quantity - this.healthyWorkers.length;
    const workers = [];
    for (let i = 0; i < num; i++) {
      workers.push(
        (async () => {
          const worker = await this.createWorker();
          this.workers.push(worker);
          return worker;
        })()
      );
    }
    return Promise.all(workers);
  }

  private execute() {
    const worker = this.healthyWorkers.sort((a, b) => a.stats - b.stats)[0];
    /* istanbul ignore if */
    if (!worker) return;
    log("execute pid", worker.process.pid);
    const script = this.pendingScripts.shift();
    /* istanbul ignore if */
    if (!script) return;
    worker.stats++;
    worker.runningScripts.push(script);
    log("execute code", script.code);
    script.start(() => this.onScriptAsyncTimeout(worker, script));
    worker.process.send({ type: MessageType.run, script });
  }

  private onScriptAsyncTimeout = (worker: Worker, script: Script) => {
    worker.runningScripts.forEach(item => {
      if (item.id === script.id) return;
      this.pendingScripts.unshift(item.stop());
    });
    script.error = "Script execution timed out.";
    this.handleScriptDone(worker, script, true);
  };

  private toCode(code: string | Function): string {
    if (!code) return ";";
    if (isFunction(code)) {
      const result = /\{([\s\S]*)\}/.exec(code.toString());
      return result[1] || "";
    } else {
      return code.toString();
    }
  }

  public preset(code: string | Function) {
    this.presets.push(this.toCode(code));
  }

  public async run(code: string | Function, sandbox?: any) {
    await this.init();
    code = [...this.presets, this.toCode(code), os.EOL].join(";");
    log("run", code);
    const { timeout, asyncTimeout } = this.options;
    const script = new Script({ code, timeout, asyncTimeout, sandbox });
    this.pendingScripts.push(script);
    this.execute();
    return script.defer;
  }
}
