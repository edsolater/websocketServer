/**TODO: 目前只是1对多，会议要多对多 */
import * as WebSocket from "ws"
import {
  sendToClient,
  getCommandFromClient,
  getPayloadFromClient,
} from "./websocketTransformMethods"
import { ID } from "./type"
import { creatId } from "./uuid"

type RoomInfo = {
  talker: ID
  audiences: ID[]
  connectedWebsockets: Map<ID, WebSocket> // 每个人有且只有一个websocket
  userIdentity: Map<ID, "TALKER" | "AUDIENCE">
  peers: Set<[ID, ID]> //只有观众能产生peer
}

const rooms: { [roomId in ID]: RoomInfo } = {
  "1": {
    talker: "",
    audiences: [],
    connectedWebsockets: new Map(),
    userIdentity: new Map(),
    peers: new Set(),
  },
}
const wss = new WebSocket.Server({ port: 5000 })
wss.on("connection", initConnect)

function initConnect(ws: WebSocket) {
  /**这条链接的所有者的id */
  let userId: ID = creatId()
  // const roomId = urlHasRoomId ?  "1" // TODO: rommID 可能由前端传过来，也可能随机生成一个
  /**这条链接所处的房间号的id */
  let roomId: ID = "1" //TEMP 暂时写死

  rooms[roomId].connectedWebsockets.set(userId, ws) //TODO: 这里能取到这个属性，这个假设是不对的

  // 如果客户端断开
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
  ws.on("message", (message) =>
    handleClientMessage({
      ws,
      userId,
      roomId,
      jsonMessage: message,
      roomInfo: rooms[roomId],
    })
  )
}

function handleClientMessage({
  ws,
  userId,
  roomId,
  jsonMessage,
  roomInfo,
}: {
  ws: WebSocket
  userId: ID
  roomId: ID
  jsonMessage: WebSocket.Data
  roomInfo: RoomInfo
}) {
  if (typeof jsonMessage !== "string") return
  const command = getCommandFromClient(jsonMessage)
  switch (command) {
    case "JOIN": {
      // 如果此用户是第一个进入的，那TA就是主播，否则是观众
      if (roomInfo.connectedWebsockets.size === 1 /* 此规则是暂时的 */) {
        console.log("a TALKER has come")
        roomInfo.userIdentity.set(userId, "TALKER")
        roomInfo.talker = userId
        sendToClient(ws, "ID", {
          peerId: "",
          userId,
          roomId,
          content: "TALKER",
        })
      } else {
        console.log("an AUDIENCE has come")
        const talkerId = roomInfo.talker
        const talkerWS = roomInfo.connectedWebsockets.get(talkerId)
        roomInfo.userIdentity.set(userId, "AUDIENCE")
        roomInfo.audiences.push(userId)
        roomInfo.peers.add([talkerId, userId])
        sendToClient(ws, "ID", {
          peerId: talkerId,
          userId,
          roomId,
          content: "AUDIENCE",
        })
        sendToClient(talkerWS, "CAN_OFFER", {
          peerId: userId,
          userId: talkerId,
          roomId,
        })
      }
      break
    }
    case "CREATE_OFFER": {
      console.log("主播发来offer")
      const payload = getPayloadFromClient<typeof command>(jsonMessage)
      const peerId = payload.peerId
      const peerWS = roomInfo.connectedWebsockets.get(peerId)
      sendToClient(peerWS, "RECEIVE_OFFER", {
        peerId,
        content: payload.content,
      })
      break
    }
    case "CREATE_ANSWER": {
      console.log("观众发来answer")
      const payload = getPayloadFromClient<typeof command>(jsonMessage)
      const peerId = payload.peerId
      const peerWS = roomInfo.connectedWebsockets.get(peerId)
      sendToClient(peerWS, "RECEIVE_ANSWER", {
        peerId,
        content: payload.content,
      })
      break
    }
    case "CANDIDATE": {
      console.log("主播/观众发来candidate")
      const payload = getPayloadFromClient<typeof command>(jsonMessage)
      const peerId = payload.peerId
      const peerWS = roomInfo.connectedWebsockets.get(peerId)
      sendToClient(peerWS, "CANDIDATE", { peerId, content: payload.content })
      break
    }
    default:
      console.error(`出现了未知命令：${command}`)
      break
  }
}
