import { ChildProcess } from 'child_process';

export interface IWorker {
  process: ChildProcess, stats: number
}