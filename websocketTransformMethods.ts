/**
 * 需要依照设定
 */
import * as WebSocket from "ws"
import {
  ClientMessages,
  ArbitraryMessagePayload,
  ToClientCommands,
} from "./WebsocketCommand"
/**
 * 脏函数，发送websocket信息给客户端
 * @param ws 针对于某一客户端的webSocket
 * @param payload
 */
export function sendToClient<C extends keyof ToClientCommands | (string & {})>(
  ws: WebSocket,
  command: C,
  payload?: C extends keyof ToClientCommands
    ? ToClientCommands[typeof command]
    : ArbitraryMessagePayload
) {
  console.info("send:command: ", command)
  ws.send(JSON.stringify({ command, payload }))
}
/**
 * 脏函数，从客户端发来的message中，获取command信息
 * @param message 客户端发来的websocket的message（无论是否JSON解析过）
 */
export function getMessageFromClient(message: string): ClientMessages {
  return typeof message === "string" ? JSON.parse(message) : message
}
