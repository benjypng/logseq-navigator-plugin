import { PREVIEW_MAX_LENGTH } from '../constants'
import { runDatascriptQuery } from '../logseq/api'
import type { NodeIdentity, Preview, PulledNode } from '../types'
import {
  isValidUuid,
  readAttr,
  refsToTitleMap,
  resolveRefTokens,
} from './queries'

const truncate = (text: string): string => {
  if (text.length <= PREVIEW_MAX_LENGTH) {
    return text
  }
  return text.slice(0, PREVIEW_MAX_LENGTH) + '…'
}

const firstBlockQuery = (pageUuid: string): string => {
  return `[:find (pull ?b [:block/title :block/order {:block/refs [:block/uuid :block/title]}])
 :where
 [?page :block/uuid #uuid "${pageUuid}"]
 [?b :block/parent ?page]
 [?b :block/title _]
 [?b :block/order _]]`
}

const hydratePage = async (node: NodeIdentity): Promise<Preview> => {
  if (isValidUuid(node.uuid) === false) {
    return { uuid: node.uuid, text: '' }
  }
  let rows: unknown[] = []
  try {
    rows = await runDatascriptQuery<unknown[]>(firstBlockQuery(node.uuid))
  } catch {
    return { uuid: node.uuid, text: '' }
  }
  let firstTitle = ''
  let lowestOrder: string | null = null
  rows.forEach((eachRow) => {
    const pulled = Array.isArray(eachRow) ? eachRow[0] : eachRow
    if (typeof pulled !== 'object' || pulled === null) {
      return
    }
    const title = readAttr(pulled as PulledNode, 'block/title')
    const order = readAttr(pulled as PulledNode, 'block/order')
    if (typeof title !== 'string' || typeof order !== 'string') {
      return
    }
    if (lowestOrder === null || order < lowestOrder) {
      lowestOrder = order
      firstTitle = resolveRefTokens(title, refsToTitleMap(pulled as PulledNode))
    }
  })
  return { uuid: node.uuid, text: truncate(firstTitle.trim()) }
}

const hydrateBlock = (node: NodeIdentity): Preview => {
  return { uuid: node.uuid, text: truncate(node.title.trim()) }
}

const hydrateOne = async (node: NodeIdentity): Promise<Preview> => {
  if (node.isPage === true) {
    return await hydratePage(node)
  }
  return hydrateBlock(node)
}

export const hydrateWindow = async (
  nodes: NodeIdentity[],
): Promise<Preview[]> => {
  const previews = await Promise.all(
    nodes.map((eachNode) => {
      return hydrateOne(eachNode)
    }),
  )
  return previews
}
