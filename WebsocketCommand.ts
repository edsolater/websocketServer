import { ID } from "./type"

export interface ToServerCommands {
  JOIN: {
    userId: ID // 辨识此设备（可以用它的互联网IP加局域网IP）
    roomId: ID // 房间号
  }
}
export interface ToClientCommands {
  // 后端告知有几个人
  IDENTITY: {
    members: ID[]
  }
}
export interface ArbitraryMessagePayload {
  fromUserId: ID
  toUserId: ID
  roomId: ID
}

export type OtherCommands = {
  [command: string]: ArbitraryMessagePayload
}
export type WebsocketMessageRuntimeFormat<
  Commands,
  T = keyof Commands
> = T extends keyof Commands ? { command: T; payload: Commands[T] } : never

export type ClientMessages = WebsocketMessageRuntimeFormat<ToServerCommands>
