# Safeify

<div align="center">

[![npm](https://img.shields.io/npm/l/safeify.svg)](LICENSE.md)
[![NPM Version](https://img.shields.io/npm/v/safeify.svg)](https://www.npmjs.com/package/safeify)
[![Build Status](https://www.travis-ci.org/Houfeng/safeify.svg?branch=master)](https://www.travis-ci.org/Houfeng/safeify)
[![Coverage Status](https://coveralls.io/repos/github/Houfeng/safeify/badge.svg?branch=master)](https://coveralls.io/github/Houfeng/safeify?branch=master)
[![npm](https://img.shields.io/npm/dt/safeify.svg)](https://www.npmjs.com/package/safeify)

</div>

# 说明

Safeify 可让 Node 应用安全的隔离执行非信任的用户自定义代码，[了解详细](//github.com/Houfeng/safeify/blob/master/DOC.md)

# 安装

```sh
npm install safeify -S
```

# 使用

```ts
import { Safeify } from "safeify";

(async ()=>{

  // 创建 safeify 实例
  const safeVm = new Safeify({
    timeout: 3000,
    asyncTimeout: 60000
  });

  // 定义 context
  const context = {
    a: 1,
    b: 2,
    system: {
      add(a: number, b: number) {
        return (a + b) * 2;
      }
    }
  };

  // 执行动态代码
  const result= await safeVm.run(`return system.add(1,2)`, context));
  console.log('result', result);

  //释放资源
  safeVm.distory();
  
})();
```