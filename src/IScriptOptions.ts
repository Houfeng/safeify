import { IUnsafe } from "./IUnsafe";

export interface IScriptOptions {
  code: string;
  timeout?: number;
  asyncTimeout?: number;
  sandbox?: any;
  unsafe?: IUnsafe;
}
