import * as  assert from 'assert';
import * as os from 'os';
import * as fs from 'fs';
import { CGroups } from "../src/CGroups";

const tmpDir = os.tmpdir(), platform = 'linux';

describe('CGroups', function () {

  it('set', async function () {
    const cgroups = new CGroups('test', tmpDir, platform);
    await cgroups.set({
      cpu: { cfs_quota_us: 100000 },
      memory: { limit_in_bytes: 1048576 }
    });
    assert.deepEqual(['cpu', 'memory'], cgroups.resources);
  });

  it('addProcess', async function () {
    const cgroups = new CGroups('test', tmpDir, platform);
    await cgroups.set({
      cpu: { cfs_quota_us: 100000 }
    });
    await cgroups.addProcess(123);
    const filename = `${cgroups.root}/cpu/${cgroups.name}/tasks`;
    const text = fs.readFileSync(filename).toString();
    assert.equal('123', text);
  });

});