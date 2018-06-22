import { ISafeifyOptions } from './ISafeifyOptions';
export declare class Safeify {
    private options;
    private workers;
    private pendingScripts;
    private runningScripts;
    private cgroups;
    private inited;
    private presets;
    constructor(opts?: ISafeifyOptions);
    init(): Promise<void>;
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
    private toCode(code);
    preset(code: string | Function): void;
    run(code: string | Function, sandbox?: any): Promise<any>;
}
