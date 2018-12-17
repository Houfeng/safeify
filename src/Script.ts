import { IScriptOptions } from "./IScriptOptions";
import { createCallProxy } from "./Proxy";

const IGNORE_PARAM = /^\_\_/;
const {
  newGuid,
  each,
  isFunction,
  isObject,
  isArray,
  isDate
} = require("ntils");

function convertParams(sandbox: any, breadcrumb: string[] = []) {
  const result = Object.create(null);
  each(sandbox, (name: string, value: any) => {
    if (IGNORE_PARAM.test(name)) return;
    const currentBreadcrumb = [...breadcrumb, name];
    if (isFunction(value)) {
      result[name] = createCallProxy(currentBreadcrumb);
    } else if (isObject(value) && !isArray(value) && !isDate(value)) {
      result[name] = convertParams(value, currentBreadcrumb);
    } else {
      result[name] = value;
    }
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
    if (!this.sandbox) this.sandbox = {};
    this.params = convertParams(this.sandbox);
    this.defer = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  toJSON() {
    // tslint:disable-next-line
    const { id, code, result, error, timeout, asyncTimeout, params } = this;
    return { id, code, result, error, timeout, asyncTimeout, params };
  }
}
