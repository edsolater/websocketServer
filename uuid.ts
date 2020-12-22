/**
 * 全局唯一，
 * 副作用
 */

import { ID } from "./type"

const idRecords = new Set<string>()
let lastId = 0

/* 创建全局唯一的id */
export function creatId():ID {
  lastId += 1
  const newId = String(lastId)
  idRecords.add(newId)
  return newId
}
