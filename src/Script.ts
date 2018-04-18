import { IScriptOptions } from './IScriptOptions';
import { createProxy } from './Proxy';

const log = require('debug')('script');
const { newGuid, each, isFunction } = require('ntils');

function createParams(sandbox: any) {
  const result = Object.assign({}, sandbox);
  each(result, (name: string, value: any) => {
    result[name] = isFunction(value) ? createProxy() : value;
  });
  return result;
}

export class Script {

  public id: string;
  public code: string;
  public sandbox: any;
  public result: any;
  public error: any;
  public timeout: number;
  public asyncTimeout: number;
  public defer: Promise<any>;
  public resolve: Function;
  public reject: Function;
  public params: any;

  constructor(options: IScriptOptions) {
    Object.assign(this, options);
    this.id = newGuid();
    if (!this.code) this.code = '';
    if (!this.sandbox) this.sandbox = {};
    this.params = createParams(this.sandbox);
    this.defer = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  toJSON() {
    const { id, code, result, error, timeout, asyncTimeout, params } = this;
    return { id, code, result, error, timeout, asyncTimeout, params };
  }

}