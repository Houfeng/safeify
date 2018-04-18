import { ChildProcess } from 'child_process';
import { WorkerStatus } from './WorkerStatus';

export interface IWorker {
  process: ChildProcess, status: WorkerStatus
}