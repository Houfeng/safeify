import { IAlias } from "./IAlias";

export interface IUnsafe {
  require?: boolean | string;
  modules?: string[] | IAlias | boolean;
}
