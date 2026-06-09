import type { BlockEntity } from '@logseq/libs/dist/LSPlugin.user'

import { PREVIEW_CHILD_COUNT, PREVIEW_MAX_LENGTH } from '../constants'
import { getBlockWithChildren, getPageBlocksTree } from '../logseq/api'
import type { NodeIdentity, Preview } from '../types'

const truncate = (text: string): string => {
  if (text.length <= PREVIEW_MAX_LENGTH) {
    return text
  }
  return text.slice(0, PREVIEW_MAX_LENGTH) + '…'
}

const joinBlockTitles = (blocks: BlockEntity[], count: number): string => {
  const titles: string[] = []
  for (const eachBlock of blocks) {
    if (titles.length >= count) {
      break
    }
    const title = eachBlock.title
    if (typeof title === 'string' && title.trim().length > 0) {
      titles.push(title.trim())
    }
  }
  return titles.join(' · ')
}

const keepFullBlocks = (children: BlockEntity['children']): BlockEntity[] => {
  if (children === undefined) {
    return []
  }
  const result: BlockEntity[] = []
  children.forEach((eachChild) => {
    if (Array.isArray(eachChild) === false) {
      result.push(eachChild as BlockEntity)
    }
  })
  return result
}

const hydratePage = async (node: NodeIdentity): Promise<Preview> => {
  const blocks = await getPageBlocksTree(node.uuid)
  const text = joinBlockTitles(blocks, PREVIEW_CHILD_COUNT)
  return { uuid: node.uuid, text: truncate(text) }
}

const hydrateBlock = async (node: NodeIdentity): Promise<Preview> => {
  const block = await getBlockWithChildren(node.uuid)
  if (block === null) {
    return { uuid: node.uuid, text: '' }
  }
  const children = keepFullBlocks(block.children)
  const text = joinBlockTitles(children, PREVIEW_CHILD_COUNT)
  return { uuid: node.uuid, text: truncate(text) }
}

const hydrateOne = async (node: NodeIdentity): Promise<Preview> => {
  if (node.isPage === true) {
    return await hydratePage(node)
  }
  return await hydrateBlock(node)
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
