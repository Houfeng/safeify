import * as fs from 'fs';
import * as os from 'os';
import * as mkdirp from 'mkdirp';

const platform = os.platform();

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

  public addProcess(pid: number) {
    if (platform !== 'linux') return;
    this.resources.forEach(resName => {
      const filename = `${this.root}/${resName}/${this.name}/tasks`;
      fs.writeFileSync(filename, pid);
    });
  }

}