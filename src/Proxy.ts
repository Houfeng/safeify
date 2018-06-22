const { isString } = require('ntils');
const callSymbol = 'func://942ccb3b-a367-a650-9981-02e44a98a5e6/';

export function createCallProxy(name: string | Array<string>) {
  if (isString(name)) {
    return callSymbol + name;
  } else {
    return callSymbol + (name as Array<string>).join('.');
  }
}

export function isCallProxy(value: any) {
  if (!isString(value)) return false;
  return (value as string).startsWith(callSymbol);
}

export function getCallName(value: string) {
  return value.replace(callSymbol, '');
}