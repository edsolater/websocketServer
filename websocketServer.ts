import * as WebSocket from "ws"
import { creatId } from "./uuid"
const wss = new WebSocket.Server({ port: 5000 })
const connectedWebsockets: { [id: string]: WebSocket } = {}
type AvailableCommands = "OFFER" | "USERID"
type Payload = {
  command: AvailableCommands
  message?: any
}

/**
 * 脏函数
 * @param ws 针对于某一客户端的webSocket
 * @param payload
 */
function sendToClient(ws: WebSocket, payload: Payload) {
  ws.send(JSON.stringify(payload))
}
/**
 * 脏函数
 * @param ws 针对于某一客户端的webSocket
 * @param payload
 */
function getFromClient(payloadString: string): Payload {
  return JSON.parse(payloadString)
}

function handleClientMessage(jsonMessage: string) {
  const eventBody = getFromClient(jsonMessage)
  switch (eventBody.command) {
    case "OFFER":
      break
    case "USERID":
      break
    default:
      break
  }
}

wss.on("connection", (ws) => {
  const userId = creatId()
  connectedWebsockets[userId] = ws
  sendToClient(ws, { command: "USERID", message: { userId } })
  ws.on("message", handleClientMessage)
})
