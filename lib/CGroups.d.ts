export declare class CGroups {
    private root;
    private name;
    private resources;
    constructor(name: string);
    set(resources: any): void;
    addProcess(pid: number): void;
}
