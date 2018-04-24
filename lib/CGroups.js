"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const mkdirp = __importStar(require("mkdirp"));
const platform = os.platform();
class CGroups {
    constructor(name) {
        this.root = '/sys/fs/cgroup';
        this.name = '';
        this.resources = [];
        this.name = name;
    }
    set(resources) {
        if (platform !== 'linux')
            return;
        const resList = Object.keys(resources);
        resList.forEach(resName => {
            if (!this.resources.some(res => res === resName)) {
                this.resources.push(resName);
            }
            const groupPath = `${this.root}/${resName}/${this.name}`;
            mkdirp.sync(groupPath);
            const setting = resources[resName];
            const settingNames = Object.keys(setting);
            settingNames.forEach(name => {
                const value = setting[name];
                const filename = `${groupPath}/${resName}.${name}`;
                fs.writeFileSync(filename, value);
            });
        });
    }
    addProcess(pid) {
        if (platform !== 'linux')
            return;
        this.resources.forEach(resName => {
            const filename = `${this.root}/${resName}/${this.name}/tasks`;
            fs.writeFileSync(filename, pid);
        });
    }
}
exports.CGroups = CGroups;
//# sourceMappingURL=CGroups.js.map