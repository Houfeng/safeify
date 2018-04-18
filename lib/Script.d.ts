import { IScriptOptions } from './IScriptOptions';
export declare class Script {
    id: string;
    code: string;
    sandbox: any;
    result: any;
    error: any;
    timeout: number;
    asyncTimeout: number;
    defer: Promise<any>;
    resolve: Function;
    reject: Function;
    params: any;
    constructor(options: IScriptOptions);
    toJSON(): {
        id: string;
        code: string;
        result: any;
        error: any;
        timeout: number;
        asyncTimeout: number;
        params: any;
    };
}
