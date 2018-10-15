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
const MessageType_1 = require("./MessageType");
const Script_1 = require("./Script");
const WorkerState_1 = require("./WorkerState");
const { isFunction, getByPath } = require('ntils');
const log = require('debug')('safeify');
const timeout = 500;
const asyncTimeout = 3000;
const cpuQuota = 0.5;
const memoryQuota = 500;
const cpuCount = os.cpus().length;
const quantity = cpuCount > 1 ? cpuCount : cpuCount * 2;
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
        this.presets = [];
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
            await this.createWorkers();
            this.execute();
        };
        Object.assign(this.options, {
            timeout, asyncTimeout, quantity, sandbox, cpuQuota, memoryQuota
        }, opts);
    }
    async init() {
        if (this.inited)
            return;
        this.inited = true;
        const { unrestricted } = this.options;
        if (!unrestricted)
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
            const breadcrumb = call.name.split('.');
            const name = breadcrumb.pop();
            const context = getByPath(script.sandbox, breadcrumb) || sandbox;
            call.result = await context[name](...call.args);
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
        const { pid, script, healthy } = message;
        const worker = this.workers.find(item => item.process.pid == pid);
        if (worker && !healthy) {
            worker.state = WorkerState_1.WorkerState.unhealthy;
            setTimeout(() => {
                worker.process.disconnect();
                worker.process.kill();
            }, this.options.asyncTimeout + 1000);
        }
        if (worker && healthy)
            worker.stats--;
        const runningIndex = this.runningScripts
            .findIndex(item => item.id === script.id);
        if (runningIndex < 0)
            return;
        const runningScript = this.runningScripts.splice(runningIndex, 1)[0];
        if (!runningScript)
            return;
        if (script.error) {
            runningScript.reject(new Error(script.error), pid);
            log('onWorkerDone error', script.id, script.error);
        }
        else {
            runningScript.resolve(script.result, pid);
            log('onWorkerDone result', script.id, script.result);
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
        const { unrestricted } = this.options;
        const process = childProcess.fork(runnerFile);
        if (!unrestricted)
            await this.cgroups.addProcess(process.pid);
        process.on('message', this.onWorkerMessage);
        process.on('disconnect', this.onWorkerDisconnect);
        const stats = 0, state = WorkerState_1.WorkerState.healthy;
        return { process, stats, state };
    }
    get healthyWorkers() {
        return this.workers.filter(worker => worker.process.connected && worker.state == WorkerState_1.WorkerState.healthy);
    }
    async createWorkers() {
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
    execute() {
        const worker = this.healthyWorkers.sort((a, b) => a.stats - b.stats)[0];
        if (!worker)
            return;
        log('execute pid', worker.process.pid);
        const script = this.pendingScripts.shift();
        if (!script)
            return;
        worker.stats++;
        this.runningScripts.push(script);
        log('execute code', script.code);
        worker.process.send({ type: MessageType_1.MessageType.run, script: script });
    }
    toCode(code) {
        if (!code)
            return ';';
        if (isFunction(code)) {
            const result = /\{([\s\S]*)\}/.exec(code.toString());
            return result[1] || '';
        }
        else {
            return code.toString();
        }
    }
    preset(code) {
        this.presets.push(this.toCode(code));
    }
    async run(code, sandbox) {
        await this.init();
        code = [...this.presets, this.toCode(code), os.EOL].join(';');
        log('run', code);
        const { timeout, asyncTimeout } = this.options;
        const script = new Script_1.Script({ code, timeout, asyncTimeout, sandbox });
        this.pendingScripts.push(script);
        this.execute();
        return script.defer;
    }
}
exports.Safeify = Safeify;
//# sourceMappingURL=Safeify.js.map