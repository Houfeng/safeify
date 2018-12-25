import { ChildProcess } from "child_process";
import { WorkerState } from "./WorkerState";
import { Script } from "./Script";

export class Worker {
  process: ChildProcess;
  stats: number;
  state: WorkerState;
  runningScripts: Script[];
  constructor(process: ChildProcess) {
    this.process = process;
    this.state = WorkerState.healthy;
    this.stats = 0;
    this.runningScripts = [];
  }
}
