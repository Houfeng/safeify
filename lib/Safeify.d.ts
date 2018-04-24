import { ISafeifyOptions } from './ISafeifyOptions';
export declare class Safeify {
    private options;
    private workers;
    private pendingScripts;
    private runningScripts;
    private cgroups;
    constructor(opts?: ISafeifyOptions);
    distory: () => void;
    readonly workerTotal: number;
    readonly pendingTotal: number;
    readonly runningTotal: number;
    private onWokerCall(message);
    private onWorkerMessage;
    private onWorkerDone(message);
    private onWorkerDisconnect;
    private createControlGroup();
    private createWorker();
    private createWorkers(num?);
    private execute(freeWorker?);
    private parseCode(func);
    run(code: string | Function, sandbox?: any): Promise<any>;
}
