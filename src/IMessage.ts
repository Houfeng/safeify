import { MessageType } from "./MessageType";

export interface IMessage {
  type: MessageType;
  [key: string]: any;
}
