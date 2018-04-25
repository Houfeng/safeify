export declare class CGroups {
    private root;
    private name;
    private resources;
    constructor(name: string);
    set(resources: any): Promise<void[][]>;
    addProcess(pid: number): Promise<void[]>;
}
