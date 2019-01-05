import { IUnsafe } from "./IUnsafe";

export interface ISafeifyOptions {
  timeout?: number;
  asyncTimeout?: number;
  /** @deprecated use workerQuota */
  quantity?: number;
  workers?: number;
  unrestricted?: boolean;
  memoryQuota?: number;
  cpuQuota?: number;
  greedy?: boolean;
  unsafe?: IUnsafe;
}
