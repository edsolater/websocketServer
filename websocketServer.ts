import * as WebSocket from "ws"
import { ID } from "./type"
import { creatId } from "./uuid"
type Offer = RTCSessionDescriptionInit
type Answer = RTCSessionDescriptionInit
type Candidate = RTCIceCandidate
type Identity = "TALKER" | "AUDIENCE"
const connectedWebsockets = new Map<ID, WebSocket>()
const members = new Map<ID, Identity>()
const cache = {
  offer: "" as Offer,
  answer: new Map<ID, Answer>(),
  candidate: new Map<ID, Candidate[]>(),
}
const wss = new WebSocket.Server({ port: 5000 })
wss.on("connection", initConnect)
type Commands = {
  ID: {
    userId: ID
    roomId: ID
    content: Identity
    /* 对于观众来说，就是主播的ID */
    receiverID: ID
  }
  JOIN: {}
  OFFER: { content: Offer }
  ANSWER: { content: Answer }
  CANDIDATE: { content: Candidate }
}

/**
 * 脏函数
 * @param ws 针对于某一客户端的webSocket
 * @param payload
 */
function sendToClient(
  ws: WebSocket,
  command: keyof Commands,
  payload?: Commands[typeof command]
) {
  console.info("send:command: ", command)
  ws.send(JSON.stringify({ command, payload }))
}

function getCommandFromClient(
  message: string | { command: string }
): keyof Commands {
  const { command } =
    typeof message === "string" ? JSON.parse(message) : message
  return command
}

function getPayloadFromClient<T extends keyof Commands>(
  message: string | { payload: any }
): Commands[T] {
  const { payload } =
    typeof message === "string" ? JSON.parse(message) : message
  return payload
}

function initConnect(ws: WebSocket) {
  const userId = creatId()
  // const roomId = urlHasRoomId ?  "1" // TODO: rommID 可能由前端传过来，也可能随机生成一个
  const roomId = "1"
  connectedWebsockets.set(userId, ws)
  ws.on("close", () => {
    connectedWebsockets.delete(userId)
    members.delete(userId)
  })
  // 首先，发送给客户端TA的id与房间号的id（如果是随机分配的房间，这是有必要的）
  // 如果是第一个进入的，那TA就是主播
  if (connectedWebsockets.size === 1 /* 规则是暂时的 */) {
    console.log("a TALKER has come")
    members.set(userId, "TALKER")
    sendToClient(ws, "ID", { userId, roomId, content: "TALKER" })
  } else {
    // 不然就是观众
    console.log("an AUDIENCE has come")
    members.set(userId, "AUDIENCE")
    sendToClient(ws, "ID", { userId, roomId, content: "AUDIENCE" })
    cache.offer
      ? sendToClient(ws, "OFFER", { content: cache.offer })
      : console.warn("主播的offer还没准备好")
  }
  ws.on("message", (message) => handleClientMessage(message, userId, roomId))
}

function handleClientMessage(
  jsonMessage: WebSocket.Data,
  userId: ID,
  roomId: ID
) {
  if (typeof jsonMessage !== "string") return
  const command = getCommandFromClient(jsonMessage)
  console.log("jsonMessage: ", jsonMessage)
  switch (command) {
    case "OFFER": {
      console.log("主播发来offer")
      const payload = getPayloadFromClient<typeof command>(jsonMessage)
      cache.offer = payload.content
      break
    }
    case "ANSWER": {
      console.log("观众发来answer")
      const payload = getPayloadFromClient<typeof command>(jsonMessage)
      cache.answer.set(userId, payload.content)
      console.log("把answer发给主播")

      const talkerIds = [...members.entries()]
        .filter(([_, identity]) => identity === "TALKER")
        .map(([id]) => id)
      console.log("[...members.values()]: ", [...members.values()])
      console.log("talkerIds: ", talkerIds)
      talkerIds.forEach((userId) => {
        sendToClient(connectedWebsockets.get(userId), "ANSWER", {
          content: payload.content,
        })
      })
      break
    }
    case "CANDIDATE": {
      console.log("主播/观众发来candidate")
      const payload = getPayloadFromClient<typeof command>(jsonMessage)
      cache.candidate.has(userId)
        ? cache.candidate.get(userId).push(payload.content)
        : cache.candidate.set(userId, [payload.content])

      const userIdentity = members.get(userId)
      const talkerIds = [...members.entries()]
        .filter(([_, identity]) => identity === "TALKER")
        .map(([id]) => id)
      const audienceIds = [...members.entries()]
        .filter(([_, identity]) => identity === "AUDIENCE")
        .map(([id]) => id)
      if (userIdentity === "AUDIENCE") {
        talkerIds.forEach((userId) => {
          sendToClient(connectedWebsockets.get(userId), "CANDIDATE", {
            content: payload.content,
          })
        })
      } else {
        audienceIds.forEach((userId) => {
          sendToClient(connectedWebsockets.get(userId), "CANDIDATE", {
            content: payload.content,
          })
        })
      }
      break
    }
    default:
      break
  }
}
