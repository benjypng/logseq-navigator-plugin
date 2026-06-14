import { PREVIEW_MAX_LENGTH } from '../constants'
import { runDatascriptQuery } from '../logseq/api'
import type { NodeIdentity, Preview } from '../types'
import { isValidUuid } from './queries'

const truncate = (text: string): string => {
  if (text.length <= PREVIEW_MAX_LENGTH) {
    return text
  }
  return text.slice(0, PREVIEW_MAX_LENGTH) + '…'
}

const firstBlockQuery = (pageUuid: string): string => {
  return `[:find ?title ?order
 :where
 [?page :block/uuid #uuid "${pageUuid}"]
 [?b :block/parent ?page]
 [?b :block/title ?title]
 [?b :block/order ?order]]`
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
    if (Array.isArray(eachRow) === false) {
      return
    }
    const title = eachRow[0]
    const order = eachRow[1]
    if (typeof title !== 'string' || typeof order !== 'string') {
      return
    }
    if (lowestOrder === null || order < lowestOrder) {
      lowestOrder = order
      firstTitle = title
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
