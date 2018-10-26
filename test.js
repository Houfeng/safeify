const child_process = require('child_process');
child_process.fork('./child.js', [], {
  execArgv: ['--inspect=0']
});
console.log('parent');