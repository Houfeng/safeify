import { ICallOptions } from './ICallOptions';
export declare class Call {
    id: string;
    name: string;
    args: string;
    result: any;
    error: any;
    defer: Promise<any>;
    resolve: Function;
    reject: Function;
    constructor(options: ICallOptions);
    toJSON(): {
        id: string;
        name: string;
        args: string;
        result: any;
        error: any;
    };
}
