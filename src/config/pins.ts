import { getPinsSetting, setPinsSetting } from '../logseq/api'

export const readPins = (): Map<string, string[]> => {
  const raw = getPinsSetting()
  const map = new Map<string, string[]>()
  if (typeof raw !== 'object' || raw === null) {
    return map
  }
  const record = raw as Record<string, unknown>
  Object.keys(record).forEach((folderId) => {
    const value = record[folderId]
    if (Array.isArray(value)) {
      const uuids: string[] = []
      value.forEach((eachUuid) => {
        if (typeof eachUuid === 'string') {
          uuids.push(eachUuid)
        }
      })
      map.set(folderId, uuids)
    }
  })
  return map
}

export const writePins = (pins: Map<string, string[]>): void => {
  const record: Record<string, string[]> = {}
  pins.forEach((uuids, folderId) => {
    record[folderId] = uuids
  })
  setPinsSetting(record)
}
