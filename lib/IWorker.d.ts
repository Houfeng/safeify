/// <reference types="node" />
import { ChildProcess } from "child_process";
import { WorkerState } from "./WorkerState";
export interface IWorker {
    process: ChildProcess;
    stats: number;
    state: WorkerState;
}
