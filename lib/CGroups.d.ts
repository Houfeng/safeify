/// <reference types="node" />
export interface IResources {
    [name: string]: any;
}
export declare class CGroups {
    root: string;
    name: string;
    resources: string[];
    platform: string;
    constructor(name: string, root?: string, platform?: NodeJS.Platform);
    set(resources: IResources): Promise<void[][]>;
    addProcess(pid: number): Promise<void[]>;
}
