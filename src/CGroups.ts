import * as os from 'os';
import * as fs from 'mz/fs';

const mkdirp = require('mkdirp');
const platform = os.platform();

const mkdir = async (dir: string) => {
  return new Promise((resolve, reject) => {
    mkdirp(dir, (err: any) => {
      if (err) return reject(err);
      resolve(dir);
    });
  });
}

export class CGroups {

  private root: string = '/sys/fs/cgroup';
  private name: string = '';
  private resources: Array<string> = [];

  constructor(name: string) {
    this.name = name;
  }

  public set(resources: any) {
    if (platform !== 'linux') return;
    const resList = Object.keys(resources);
    return Promise.all(resList.map(async resName => {
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

  public addProcess(pid: number) {
    if (platform !== 'linux') return;
    return Promise.all(this.resources.map(resName => {
      const filename = `${this.root}/${resName}/${this.name}/tasks`;
      return fs.writeFile(filename, String(pid));
    }));
  }

}