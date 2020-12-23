/**
 * 需要依照设定
 */
import * as WebSocket from "ws"
import { ID } from "./type"
type WebRTCIdentity = "TALKER" | "AUDIENCE"
type Commands = {
  //TODO: 感觉这个流程不太对， P2P不应该是有方向的。offer不可知的话，这个流程有点怪异
  JOIN: {} // 当用户进入时，告知后端
  ID: {
    peerId: ID
    userId: ID
    roomId: ID
    content: WebRTCIdentity
  } // 后端告知身份信息
  //【主播接收】后端通知主播：可以发来OFFER了 // 仅限主播在第二个人加入后，才会收到
  CAN_OFFER: { /* 需要建立连接的客户端 */ peerId: ID; userId: ID; roomId: ID }
  //【主播发起】主播给后端offer信息
  CREATE_OFFER: {
    content: RTCSessionDescriptionInit
    userId: ID
    roomId: ID
    peerId: ID
  }
  //【观众接收】观众从后端收到主播的offer信息
  RECEIVE_OFFER: {
    content: RTCSessionDescriptionInit
    userId: ID
    roomId: ID
    peerId: ID
  }
  //【观众发起】观众给后端answer信息
  CREATE_ANSWER: {
    content: RTCSessionDescriptionInit
    userId: ID
    roomId: ID
    peerId: ID
  }
  // 【主播接收】主播从后端收到观众的answer信息
  RECEIVE_ANSWER: {
    content: RTCSessionDescriptionInit
    userId: ID
    roomId: ID
    peerId: ID
  }
  // 主播观众通用
  CANDIDATE: {
    content: RTCIceCandidate
    userId: ID
    roomId: ID
    peerId: ID
  }
}
/**
 * 脏函数，发送websocket信息给客户端
 * @param ws 针对于某一客户端的webSocket
 * @param payload
 */
export function sendToClient(
  ws: WebSocket,
  command: keyof Commands,
  payload?: Commands[typeof command]
) {
  console.info("send:command: ", command)
  ws.send(JSON.stringify({ command, payload }))
}
/**
 * 脏函数，从客户端发来的message中，获取command信息
 * @param message 客户端发来的websocket的message（无论是否JSON解析过）
 */
export function getCommandFromClient(
  message: string | { command: string }
): keyof Commands {
  const { command } =
    typeof message === "string" ? JSON.parse(message) : message
  return command
}
/**
 * 脏函数，从客户端发来的message中，获取payload信息
 * @param message 客户端发来的websocket的message（无论是否JSON解析过）
 */
export function getPayloadFromClient<T extends keyof Commands>(
  message: string | { payload: any }
): Commands[T] {
  const { payload } =
    typeof message === "string" ? JSON.parse(message) : message
  return payload
}
