import { ID } from "./type"
import * as WebSocket from "ws"

type WSMap = Map<
  WebSocket,
  {
    userId: ID
    roomId: ID
  }
>
type Room = {
  [roomId in ID]: {
    wss: Map<ID, WebSocket>
  }
}
//会议房间（最主要的全局变量）
const rooms: Room = {}
const wsMap: WSMap = new Map()

export function getWS(roomId: string, userId: ID): WebSocket | undefined {
  return rooms[roomId].wss.get(userId)
}

export function getRoomMembers(roomId: string) {
  return [...rooms[roomId].wss.keys()]
}

export function recordWSSInfo(ws: WebSocket, roomId: string, userId: string) {
  // 记录到room名单
  if (roomId in rooms) {
    rooms[roomId].wss =
      rooms[roomId].wss?.set(userId, ws) ?? new Map([[userId, ws]])
  } else {
    rooms[roomId] = { wss: new Map([[userId, ws]]) }
  }

  // 记录到websocket与userId的对照表
  wsMap.set(ws, { roomId, userId })
}

export function removeWSS(ws: WebSocket) {
  const { roomId, userId } = wsMap.get(ws)
  // 从websocket与userId的对照表中，删除
  wsMap.delete(ws)

  // 从room名单中删除
  rooms[roomId].wss.delete(userId)
}
