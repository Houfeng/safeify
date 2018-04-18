import { ICallOptions } from './ICallOptions';

const log = require('debug')('Call');
const { newGuid } = require('ntils');

export class Call {

  public id: string;
  public name: string;
  public args: string;
  public result: any;
  public error: any;
  public defer: Promise<any>;
  public resolve: Function;
  public reject: Function;

  constructor(options: ICallOptions) {
    Object.assign(this, options);
    this.id = newGuid();
    this.defer = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  toJSON() {
    const { id, name, args, result, error } = this;
    return { id, name, args, result, error };
  }

}