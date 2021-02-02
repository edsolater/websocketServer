import * as WebSocket from "ws"
import { sendToClient, getMessageFromClient } from "./websocketTransformMethods"
import { ID } from "./type"
import { ArbitraryMessagePayload } from "./WebsocketCommand"

type RoomInfo = {
  wss: Map<ID, WebSocket>
}
type Room = {
  [roomId in ID]: RoomInfo
}
//会议房间（最主要的全局变量）
const rooms: Room = {}
const wss = new WebSocket.Server({ port: 5000 })
wss.on("connection", initWebsocketServer)

function initWebsocketServer(ws: WebSocket) {
  // let userId: ID = creatId()
  ws.on("message", (message) =>
    handleClientMessage({
      ws,
      websocketMessage: message,
    })
  )
  // ws.on("close", () => {
  //   rooms[roomId].connectedWebsockets.delete(userId)
  //   rooms[roomId].userIdentity.delete(userId)
  //   const peers = [...rooms[roomId].peers.values()].filter(([aId, bId]) => {
  //     aId === userId || bId === userId
  //   })
  //   peers.forEach((peer) => {
  //     rooms[roomId].peers.delete(peer)
  //   })
  // })
}

function handleClientMessage({
  ws,
  websocketMessage: jsonMessage,
}: {
  ws: WebSocket
  websocketMessage: WebSocket.Data
}) {
  if (typeof jsonMessage !== "string") return // 未作 websocket 传来ArrayBuffer的情况
  const message = getMessageFromClient(jsonMessage)
  switch (message.command) {
    case "JOIN": {
      const roomId = message.payload.roomId
      const clientUserId = message.payload.userId
      recordWSSInfo(roomId, clientUserId, ws)
      const roomMembers = [...rooms[roomId].wss.keys()]
      sendToClient(ws, "IDENTITY", {
        members: roomMembers,
      })
      break
    }
    default: {
      const payload = (message.payload as unknown) as ArbitraryMessagePayload
      const command = (message.command as unknown) as string
      const roomId = payload.roomId
      const targetWS = rooms[roomId].wss.get(payload.toUserId)
      // 单纯地转发
      sendToClient(targetWS, command, payload)
    }
  }
}
function recordWSSInfo(roomId: string, userId: string, ws: WebSocket) {
  if (roomId in rooms) {
    rooms[roomId].wss =
      rooms[roomId].wss?.set(userId, ws) ?? new Map([[userId, ws]])
  } else {
    rooms[roomId] = { wss: new Map([[userId, ws]]) }
  }
}
