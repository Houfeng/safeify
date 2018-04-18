const proxySymbol = 'proxy://942ccb3b-a367-a650-9981-02e44a98a5e6';

export function createProxy() {
  return proxySymbol;
}

export function isProxy(value: any) {
  return value == proxySymbol;
}