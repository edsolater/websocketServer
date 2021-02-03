import * as WebSocket from "ws"
import { sendToClient, getMessageFromClient } from "./websocketTransformMethods"
import { ArbitraryMessagePayload } from "./WebsocketCommand"
import { getRoomMembers, getWS, recordWSSInfo, removeWSS } from "./room"

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
  ws.on("close", () => {
    removeWSS(ws)
  })
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
      recordWSSInfo(ws, roomId, clientUserId)
      const roomMembers = getRoomMembers(roomId)
      sendToClient(ws, "IDENTITY", {
        members: roomMembers,
      })
      break
    }
    default: {
      const payload = (message.payload as unknown) as ArbitraryMessagePayload
      const command = (message.command as unknown) as string
      const targetWS = getWS(payload.roomId, payload.toUserId)
      // 转发
      sendToClient(targetWS, command, payload)
    }
  }
}
