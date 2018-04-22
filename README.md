# Safeify

> 让你的 Node 应用安全的隔离的执行非信任的用户自定义代码。

![1](https://segmentfault.com/img/bV88V9?w=1598&h=842)

## 有哪些动态执行脚本的场景？

在一些应用中，我们希望给用户提供插入自定义逻辑的能力，比如 Microsoft 的 Office 中的 `VBA`，比如一些游戏中的 `lua` 脚本，FireFox 的「油猴脚本」，能够让用户发在可控的范围和权限内发挥想象做一些好玩、有用的事情，扩展了能力，满足用户的个性化需求。

大多数都是一些客户端程序，在一些在线的系统和产品中也常常也有类似的需求，事实上，在线的应用中也有不少提供了自定义脚本的能力，比如 Google Docs 中的 `Apps Script`，它可以让你使用 `JavaScript` 做一些非常有用的事情，比如运行代码来响应文档打开事件或单元格更改事件，为公式制作自定义电子表格函数等等。

与运行在「用户电脑中」的客户端应用不同，用户的自定义脚本通常只能影响用户自已，而对于在线的应用或服务来讲，有一些情况就变得更为重要，比如「安全」，用户的「自定义脚本」必须严格受到限制和隔离，即不能影响到宿主程序，也不能影响到其它用户。

而 Safeify 就是一个针对 Nodejs 应用，用于安全执行用户自定义的非信任脚本的模块。


## 怎样安全的执行动态脚本？

我们先看看通常都能如何在 JavaScript 程序中动态执行一段代码？比如大名顶顶的 `eval`

```js
eval('1+2')
```

上述代码没有问题顺利执行了，`eval` 是全局对象的一个函数属性，执行的代码拥有着和应程中其它正常代码一样的的权限，它能访问「执行上下文」中的局部变量，也能访问所有「全局变量」，在这个场景下，它是一个非常危险的函数。

再来看看 `Functon`，通过 `Function` 构造器，我们可以动态的创建一个函数，然后执行它

```js
const sum = new Function('m', 'n', 'return m + n');
console.log(sum(1, 2));
```

它也一样的顺利执行了，使用 Function 构造器生成的函数，并不会在创建它的上下文中创建闭包，一般在全局作用域中被创建。当运行函数的时候，只能访问自己的本地变量和全局变量，不能访问 Function 构造器被调用生成的上下文的作用域。如同一个站在地上、一个站在一张薄薄的纸上一样，在这个场景下，几乎没有高下之分。

** 结合 ES6 的新特性 `Proxy` 便能更安全一些 ** 

```js
function evalute(code,sandbox) {
  sandbox = sandbox || Object.create(null);
  const fn = new Function('sandbox', `with(sandbox){return (${code})}`);
  const proxy = new Proxy(sandbox, {
    has(target, key) {
      // 让动态执行的代码认为属性已存在
      return true; 
    }
  });
  return fn(proxy);
}
evalute('1+2') // 3
evalute('console.log(1)') // Cannot read property 'log' of undefined
```

我们知道无论 `eval` 还是 `function`，执行时都会把作用域一层一层向上查找，如果找不到会一直到 `global`，那么利用 `Proxy` 的原理就是，让执行了代码在 `sandobx` 中找的到，以达到「防逃逸」的目的。

> 在浏览器中，还可以利用 iframe，创建一个再发安全的一些隔离环境，本文也着眼于 Node.js，在这里不做过多讨论。

** 在 Node.js 中呢，有没有其它选择？**

或许没看到这儿之前你就已经想到了 `VM`，它是 Node.js 默认就提供的一个内建模块，`VM` 模块提供了一系列 API 用于在 V8 虚拟机环境中编译和运行代码。JavaScript 代码可以被编译并立即运行，或编译、保存然后再运行。

```js
const vm = require('vm');
const script = new vm.Script('m + n');
const sandbox = { m: 1, n: 2 };
const context = new vm.createContext(sandbox);
script.runInContext(context);
```
执行上这的代码就能拿到结果 `3`，同时，通过 `vm.Script` 还能指定代码执行了「最大毫秒数」，超过指定的时长将终止执行并抛出一个异常

```js
try {
  const script = new vm.Script('while(true){}',{ timeout: 50 });
  ....
} catch (err){
  //打印超时的 log
  console.log(err.message);
}
```

上面的脚本执行将会失败，被检测到超时并抛出异常，然后被 `Try Cache` 捕获到并打出 log，但同时需要注意的是 `vm.Script` 的 `timeout` 选项「只针对同步代有效」，而不包括是异步调用的时间，比如

```js
  const script = new vm.Script('setTimeout(()=>{},2000)',{ timeout: 50 });
  ....
```

上述代码，并不是会在 50ms 后抛出异常，因为 50ms 上边的代码同步执行肯定完了，而 `setTimeout` 所用的时间并不算在内，也就是说 `vm` 模块没有办法对异步代码直接限制执行时间。我们也不能额外通过一个 `timer` 去检查超时，因为检查了执行中的 vm 也没有方法去中止掉。

另外，在 Node.js 通过 `vm.runInContext` 看起来似乎隔离了代码执行环境，但实际上却很容易「逃逸」出去。

```js
const vm = require('vm');
const sandbox = {};
const script = new vm.Script('this.constructor.constructor("return process")().exit()');
const context = vm.createContext(sandbox);
script.runInContext(context);
```

执行上边的代码，宿主程序立即就会「退出」，`sandbox` 是在 `VM` 之外的环境创建的，需 `VM` 中的代码的 `this` 指向的也是 `sandbox`，那么

```js
//this.constructor 就是外所的 Object 构建函数
const ObjConstructor = this.constructor; 
//ObjConstructor 的 constructor 就是外包的 Function
const Function = ObjConstructor.constructor;
//创建一个函数，并执行它，返回全局 process 全局对象
const process = (new Function('return process'))(); 
//退出当前进程
process.exit(); 
```
没有人愿意用户一段脚本就能让应用挂掉吧。除了退出进程序之外，实际上还能干更多的事情。

有个简单的方法就能避免通过 `this.constructor` 拿到 `process`，如下：

```js
const vm = require('vm');
//创建一外无 proto 的空白对象作为 sandbox
const sandbox = Object.create(null);
const script = new vm.Script('...');
const context = vm.createContext(sandbox);
script.runInContext(context);
```

但还是有风险的，由于 JavaScript 本身的动态的特点，各种黑魔法防不胜防。事实 Node.js 的官方文档中也提到 `VM` 当做一个安全的沙箱去执行任意非信任的代码。

** 有哪些做了进一步工作的社区模块？ **

在社区中有一些开源的模块用于运行不信任代码，例如 `sandbox`、`vm2`、`jailed` 等。相比较而言 `vm2` 对各方面做了更多的安全工作，相对安全些。

从 `vm2` 的官方 `READM` 中可以看到，它基于 Node.js 内建的 VM 模块，来建立基础的沙箱环境，然后同时使用上了文介绍过的 ES6 的 `Proxy` 技术来防止沙箱脚本逃逸。

用同样的测试代码来试试 `vm2`

```js 
const { VM } = require('vm2');
new VM().run('this.constructor.constructor("return process")().exit()');
```

如上代码，并没有成功结束掉宿主程序，vm2 官方 REAME 中说「vm2 是一个沙盒，可以在 Node.js 中按全的执行不受信任的代码」。

然而，事实上我们还是可以干一些「坏」事情，比如：

```js
const { VM } = require('vm2');
const vm = new VM({ timeout: 1000, sandbox: {}});
vm.run('new Promise(()=>{})');
```

上边的代码将永远不会执行结束，如同 Node.js 内建模块一样 vm2 的 `timeout` 对异步操作是无效的。同时，`vm2` 也不能额外通过一个 `timer` 去检查超时，因为它也没有办法将执行中的 vm 终止掉。这会一点点耗费完服务器的资源，让你的应用挂掉。

那么或许你会想，我们能不能在上边的 `sandbox` 中放一个假的 `Promise` 从而禁掉 Promise 呢？答案是能提供一个「假」的 `Promise`，但却没有办法完成禁掉 `Promise`，比如

```js
const { VM } = require('vm2');
const vm = new VM({ 
  timeout: 1000, sandbox: { Promise: function(){}}
});
vm.run('Promise = (async function(){})().constructor;new Promise(()=>{});');
```

可以看到通过一行 `Promise = (async function(){})().constructor` 就可以轻松再次拿到 `Promise` 了。从另一个层面来看，况且或许有时我们还想让自定义脚本支持异步处理呢。


## 如何建立一个更安全一些的沙箱？

通过上文的探究，我们并没有找到一个完美的方案在 Node.js 建立安全的隔离的沙箱。其中 vm2 做了不少处理，相对来讲算是较安全的方案了，但问题也很明显，比如异步不能检查超时的问题、和宿主程序在相同进程的问题。

没有进程隔离时，通过 VM 创建的 sanbox 大体是这样的

![2](https://segmentfault.com/img/bV88VW?w=1232&h=626)

那么，我们是不是可以尝试，将非受信代码，通过 vm2 这个模块隔离在一个独立的进程中执行呢？然后，执行超时时，直接将隔离的进程干掉，但这里我们需要考虑如下几个问题

** 通过进程池统调度管理沙箱进程 **

如果来一个执行任务，创建一个进程，用完销毁，仅处理进程的开销就已经稍大了，并且也不能不设限的开新进程和宿主应用抢资源，那么，需要建一个进程池，所有任务到来会创建一个 `Script` 实例，先进入一个 `pending` 队列，然后直接将 `script` 实例的 `defer` 对象返回，调用处就能 `await` 执行结果了，然后由 `sandbox master` 根据工程进程的空闲程序来调度执行，master 会将 `script` 的执行信息，包括重要的 `ScriptId`，发送给空闲的 worker，worker 执行完成后会将「结果 + script 信息」回传给 master，master 通过 ScriptId 识别是哪个脚本执行完毕了，就是结果进行 `resolve` 或 reject 处理。

这样，通过「进程池」即能降低「进程来回创建和销毁的开销」，也能确保不过度抢占宿主资源，同时，在异步操作超时，还能将工程进程直接杀掉，同时，master 将发现一个工程进程挂掉，会立即创建替补进程。

** 处理的数据和结果，还有公开给沙箱的方法 **

进程间如何通讯，需要「动态代码」处理数据可以直接序列化后通过 IPC 发送给隔离 Sandbox 进程，执行结果一样经过序列化通过 IPC 传输。

其中，如果想法公开一个方法给 sandbox，因为不在一个进程，并不能方便的将一个方案的引用传递给 sandbox。我们可以将宿主的方法，在传递给 sandbox worker 之类做一下处理，转换为一个「描述对象」，包括了允许 sandbox 调用的方法信息，然后将信息，如同其它数据一样发送给 worker 进程，worker 收到数据后，识出来所「方法描述对象」，然后在 worker 进程中的 sandbox 对象上建立代理方法，代理方法同样通过 IPC 和 master 通讯。

** 最终，我们建立了一个大约这样的「沙箱环境」**

![3](https://segmentfault.com/img/bV88VU?w=1642&h=820)

如此这般处理起来是不是感觉很麻烦？但我们就有了一个更加安全一些的沙箱环境了，这些处理。笔者已经基于 TypeScript 编写，并封装为一个独立的模块 `Safeify`。

GitHub: https://github.com/Houfeng/safeify ，欢迎 Star & Issues

最后，简单介绍一下 Safeify 如何使用，通过如下命令安装

```sh
npm i safeify --save
```

在应用中使用，还是比较简单的，如下代码（TypeScript 中类似）

```js
import { Safeify } from './Safeify';

const safeVm = new Safeify({
  timeout: 50,          //超时时间，默认 50ms
  asyncTimeout: 500,    //包含异步操作的超时时间，默认 500ms
  quantity: 4           //沙箱进程数量，默认同 CPU 核数
});

const context = {
  a: 1, 
  b: 2,
  add(a, b) {
    return a + b;
  }
};

const rs = await safeVm.run(`return add(a,b)`, context);
console.log('result',rs);
```

关于安全的问题，没有最安全，只有更安全，Safeify 已在一个项目中使用，但自定义脚本的功能是仅针对内网用户，有不少动态执行代码的场景其实是可以避免的，绕不开或实在需要提供这个功能时，希望本文或 Safeify 能对大家有所帮助就行了。

-- end --

