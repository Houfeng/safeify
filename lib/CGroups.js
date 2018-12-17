"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const os = __importStar(require("os"));
const fs = __importStar(require("mz/fs"));
const mkdirp = require("mkdirp");
const mkdir = async (dir) => {
    return new Promise((resolve, reject) => {
        mkdirp(dir, (err) => {
            if (err)
                return reject(err);
            resolve(dir);
        });
    });
};
class CGroups {
    constructor(name, root = "/sys/fs/cgroup", platform = os.platform()) {
        this.name = "";
        this.resources = [];
        this.root = root;
        this.name = name;
        this.platform = platform;
    }
    set(resources) {
        if (this.platform !== "linux")
            return;
        const resList = Object.keys(resources);
        return Promise.all(resList.map(async (resName) => {
            if (!this.resources.some(res => res === resName)) {
                this.resources.push(resName);
            }
            const groupPath = `${this.root}/${resName}/${this.name}`;
            await mkdir(groupPath);
            const setting = resources[resName];
            const settingNames = Object.keys(setting);
            return Promise.all(settingNames.map(name => {
                const value = setting[name];
                const filename = `${groupPath}/${resName}.${name}`;
                return fs.writeFile(filename, value);
            }));
        }));
    }
    addProcess(pid) {
        if (this.platform !== "linux")
            return;
        return Promise.all(this.resources.map(resName => {
            const filename = `${this.root}/${resName}/${this.name}/tasks`;
            return fs.writeFile(filename, String(pid));
        }));
    }
}
exports.CGroups = CGroups;
//# sourceMappingURL=CGroups.js.map