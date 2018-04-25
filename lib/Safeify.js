"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const os = __importStar(require("os"));
const childProcess = __importStar(require("child_process"));
const CGroups_1 = require("./CGroups");
const WorkerStatus_1 = require("./WorkerStatus");
const MessageType_1 = require("./MessageType");
const Script_1 = require("./Script");
const { isFunction } = require('ntils');
const log = require('debug')('safeify');
const cpuTotal = os.cpus().length;
const timeout = 50;
const asyncTimeout = 500;
const cpuQuota = 0.5;
const memoryQuota = 500;
const quantity = cpuTotal > 1 ? cpuTotal : 2;
const runnerFile = require.resolve('./runner');
const sandbox = Object.create(null);
class Safeify {
    constructor(opts = {}) {
        this.options = {};
        this.workers = [];
        this.pendingScripts = [];
        this.runningScripts = [];
        this.cgroups = null;
        this.inited = false;
        this.distory = () => {
            this.workers.forEach(item => {
                item.process.removeAllListeners('message');
                item.process.removeAllListeners('disconnect');
                item.process.kill();
            });
            this.workers = [];
        };
        this.onWorkerMessage = (message) => {
            switch (message.type) {
                case MessageType_1.MessageType.done:
                    return this.onWorkerDone(message);
                case MessageType_1.MessageType.call:
                    return this.onWokerCall(message);
            }
        };
        this.onWorkerDisconnect = async () => {
            log('onWorkerDisconnect', 'pendingScripts', this.pendingScripts.length);
            this.workers = this.workers.filter(item => item.process.connected);
            const num = this.options.quantity - this.workers.length;
            const newWorkers = await this.createWorkers(num);
            log('onWorkerDisconnect', 'newWorkers', newWorkers.length);
            newWorkers.forEach(item => this.execute(item));
        };
        Object.assign(this.options, {
            timeout, quantity, sandbox, cpuQuota, memoryQuota
        }, opts);
    }
    async init() {
        if (this.inited)
            return;
        this.inited = true;
        await this.createControlGroup();
        await this.createWorkers();
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
    async onWokerCall(message) {
        const { call, pid, scriptId } = message;
        if (!call)
            return;
        const script = this.runningScripts.find(item => item.id == scriptId);
        if (!script)
            return;
        try {
            call.result = await script.sandbox[call.name](...call.args);
        }
        catch (err) {
            call.error = err.message;
        }
        const worker = this.workers.find(item => item.process.pid == pid);
        if (!worker)
            return;
        const type = MessageType_1.MessageType.ret;
        worker.process.send({ type, call });
    }
    onWorkerDone(message) {
        const { pid, script, willExit } = message;
        if (!willExit) {
            const worker = this.workers.find(item => item.process.pid == pid);
            if (worker) {
                log('onWorkerDone free pid', worker.process.pid);
                worker.status = WorkerStatus_1.WorkerStatus.free;
                this.execute(worker);
            }
        }
        const runningIndex = this.runningScripts
            .findIndex(item => item.id === script.id);
        if (runningIndex > -1) {
            const runningScript = this.runningScripts.splice(runningIndex, 1)[0];
            if (runningScript) {
                if (script.error) {
                    runningScript.reject(new Error(script.error), pid);
                    log('onWorkerDone error', script.id, script.error);
                }
                else {
                    runningScript.resolve(script.result, pid);
                    log('onWorkerDone result', script.id, script.result);
                }
            }
        }
    }
    createControlGroup() {
        this.cgroups = new CGroups_1.CGroups('safeify');
        const { cpuQuota, memoryQuota } = this.options;
        return this.cgroups.set({
            cpu: { cfs_quota_us: 100000 * cpuQuota },
            memory: { limit_in_bytes: 1048576 * memoryQuota }
        });
    }
    async createWorker() {
        const process = childProcess.fork(runnerFile);
        await this.cgroups.addProcess(process.pid);
        process.on('message', this.onWorkerMessage);
        process.on('disconnect', this.onWorkerDisconnect);
        const status = WorkerStatus_1.WorkerStatus.free;
        return { process, status };
    }
    async createWorkers(num) {
        if (!num)
            num = this.options.quantity;
        const newWorkers = [];
        for (let i = 0; i < num; i++) {
            newWorkers.push((async () => {
                const worker = await this.createWorker();
                this.workers.push(worker);
                return worker;
            })());
        }
        return Promise.all(newWorkers);
    }
    execute(freeWorker) {
        const worker = freeWorker ? freeWorker : this.workers
            .find(item => item.status == WorkerStatus_1.WorkerStatus.free);
        if (!worker || worker.status == WorkerStatus_1.WorkerStatus.busy)
            return;
        log('execute pid', worker.process.pid);
        const script = this.pendingScripts.shift();
        if (!script)
            return;
        worker.status = WorkerStatus_1.WorkerStatus.busy;
        this.runningScripts.push(script);
        log('execute code', script.code);
        worker.process.send({
            type: MessageType_1.MessageType.run,
            script: script
        });
    }
    parseCode(func) {
        const result = /\{([\s\S]*)\}/.exec(func.toString());
        return result[1] || '';
    }
    async run(code, sandbox) {
        await this.init();
        code = isFunction(code) ? this.parseCode(code) : code;
        log('run', code);
        const { timeout } = this.options;
        const script = new Script_1.Script({ code, timeout, asyncTimeout, sandbox });
        this.pendingScripts.push(script);
        this.execute();
        return script.defer;
    }
}
exports.Safeify = Safeify;
//# sourceMappingURL=Safeify.js.map