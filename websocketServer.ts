import * as WebSocket from "ws"
import {
  sendToClient,
  getCommandFromClient,
  getPayloadFromClient,
} from "./websocketTransformMethods"
import { ID } from "./type"
import { creatId } from "./uuid"

const rooms: {
  [roomId in ID]: {
    talker: ID
    connectedWebsockets: Map<ID, WebSocket> // 每个人有且只有一个websocket
    userIdentity: Map<ID, 'TALKER' | 'AUDIENCE'>
    peers: Set<[ID, ID]> //只有观众能产生peer
  }
} = {}
const wss = new WebSocket.Server({ port: 5000 })
wss.on("connection", initConnect)

function initConnect(ws: WebSocket) {
  let userId: ID = creatId()
  let peerId: ID
  // const roomId = urlHasRoomId ?  "1" // TODO: rommID 可能由前端传过来，也可能随机生成一个
  let roomId: ID = "1"
  rooms[roomId].connectedWebsockets.set(userId, ws)
  ws.on("close", () => {
    rooms[roomId].connectedWebsockets.delete(userId)
    rooms[roomId].userIdentity.delete(userId)
    const peers = [...rooms[roomId].peers.values()].filter(([aId, bId]) => {
      aId === userId || bId === userId
    })
    peers.forEach((peer) => {
      rooms[roomId].peers.delete(peer)
    })
  })
  // 如果是第一个进入的，那TA就是主播，不然就是主播
  if (rooms[roomId].connectedWebsockets.size === 1 /* 此规则是暂时的 */) {
    console.log("a TALKER has come")
    rooms[roomId].userIdentity.set(userId, "TALKER")
    rooms[roomId].talker = userId
    sendToClient(ws, "ID", { userId, roomId, content: "TALKER" })
  } else {
    console.log("an AUDIENCE has come")
    rooms[roomId].userIdentity.set(userId, "AUDIENCE")
    peerId = rooms[roomId].talker
    rooms[roomId].peers.add([peerId, userId])
    sendToClient(ws, "ID", { userId, roomId, content: "AUDIENCE" })
  }
  ws.on("message", (message) =>
    handleClientMessage({
      ws,
      jsonMessage: message,
      userId,
      userIdentity: rooms[roomId].userIdentity.get(userId),
      roomId,
    })
  )
}

function handleClientMessage({
  ws,
  jsonMessage,
  userId,
  roomId,
  userIdentity,
}: {
  ws: WebSocket
  jsonMessage: WebSocket.Data
  userId: ID
  roomId: ID
  userIdentity: "TALKER" | "AUDIENCE"
}) {
  if (typeof jsonMessage !== "string") return
  const command = getCommandFromClient(jsonMessage)
  switch (command) {
    case "CREATE_OFFER": {
      console.log("主播发来offer")
      const payload = getPayloadFromClient<typeof command>(jsonMessage)
      sendToClient(ws, "RECEIVE_OFFER", { content: payload.content })
      break
    }
    case "CREATE_ANSWER": {
      console.log("观众发来answer")
      const payload = getPayloadFromClient<typeof command>(jsonMessage)
      sendToClient(ws, "RECEIVE_ANSWER", { content: payload.content })
      break
    }
    case "CANDIDATE": {
      console.log("主播/观众发来candidate")
      const payload = getPayloadFromClient<typeof command>(jsonMessage)
      sendToClient(
        rooms[roomId].connectedWebsockets.get(talkerId),
        "CANDIDATE",
        { content: payload.content }
      )
      break
    }
    default:
      console.error(`出现了未知命令：${command}`)
      break
  }
}
