import type { BlockEntity, PageEntity } from '@logseq/libs/dist/LSPlugin.user'

import { NAVIGATOR_INLINE_STYLE } from '../constants'

export const runDatascriptQuery = async <ResultType>(
  query: string,
): Promise<ResultType> => {
  const result = await logseq.DB.datascriptQuery<ResultType>(query)
  return result
}

export const getCurrentEntity = async (): Promise<
  PageEntity | BlockEntity | null
> => {
  const current = await logseq.Editor.getCurrentPage()
  return current
}

export const getPage = async (
  nameOrUuid: string,
): Promise<PageEntity | null> => {
  const page = await logseq.Editor.getPage(nameOrUuid)
  return page
}

export const getPagesFromNamespace = async (
  namespace: string,
): Promise<PageEntity[]> => {
  const pages = await logseq.Editor.getPagesFromNamespace(namespace)
  if (pages === null) {
    return []
  }
  return pages
}

export const getAllTags = async (): Promise<PageEntity[]> => {
  const tags = await logseq.Editor.getAllTags()
  if (tags === null) {
    return []
  }
  return tags
}

export const getTagObjects = async (
  nameOrIdent: string,
): Promise<BlockEntity[]> => {
  const objects = await logseq.Editor.getTagObjects(nameOrIdent)
  if (objects === null) {
    return []
  }
  return objects
}

export const getLinkedReferenceBlocks = async (
  pageNameOrUuid: string,
): Promise<BlockEntity[]> => {
  const grouped = await logseq.Editor.getPageLinkedReferences(pageNameOrUuid)
  if (grouped === null) {
    return []
  }
  const blocks: BlockEntity[] = []
  grouped.forEach((eachTuple) => {
    const tupleBlocks = eachTuple[1]
    if (Array.isArray(tupleBlocks)) {
      tupleBlocks.forEach((eachBlock) => {
        blocks.push(eachBlock)
      })
    }
  })
  return blocks
}

export const registerBlockBookmarkMenu = (
  handler: (uuid: string) => void,
): void => {
  logseq.Editor.registerBlockContextMenuItem('Bookmark', async (event) => {
    handler(event.uuid)
  })
}

export const registerPageBookmarkMenu = (
  handler: (pageName: string) => void,
): void => {
  logseq.App.registerPageMenuItem('Bookmark', (event) => {
    handler(event.page)
  })
}

export const getPageBlocksTree = async (
  nameOrUuid: string,
): Promise<BlockEntity[]> => {
  const blocks = await logseq.Editor.getPageBlocksTree(nameOrUuid)
  if (blocks === null) {
    return []
  }
  return blocks
}

export const getBlockWithChildren = async (
  uuid: string,
): Promise<BlockEntity | null> => {
  const block = await logseq.Editor.getBlock(uuid, { includeChildren: true })
  return block
}

export const createPage = async (name: string): Promise<PageEntity | null> => {
  const page = await logseq.Editor.createPage(
    name,
    {},
    { redirect: false, createFirstBlock: false },
  )
  return page
}

export const appendBlockInPage = async (
  pageName: string,
  content: string,
): Promise<BlockEntity | null> => {
  const block = await logseq.Editor.appendBlockInPage(pageName, content)
  return block
}

export const updateBlock = async (
  uuid: string,
  content: string,
): Promise<void> => {
  await logseq.Editor.updateBlock(uuid, content)
}

export const navigateToNode = (uuid: string): void => {
  logseq.App.pushState('page', { name: uuid })
}

export const onRouteChanged = (callback: () => void): (() => void) => {
  const off = logseq.App.onRouteChanged(() => {
    callback()
  })
  return off
}

export const onGraphChanged = (callback: () => void): (() => void) => {
  const off = logseq.App.onCurrentGraphChanged(() => {
    callback()
  })
  return off
}

export const onDbChanged = (
  callback: (changedUuids: string[]) => void,
): (() => void) => {
  const off = logseq.DB.onChanged((event) => {
    const uuids: string[] = []
    if (Array.isArray(event.blocks)) {
      event.blocks.forEach((eachBlock) => {
        if (typeof eachBlock.uuid === 'string') {
          uuids.push(eachBlock.uuid)
        }
      })
    }
    callback(uuids)
  })
  return off
}

export const setMainUIWidth = (widthPx: number): void => {
  logseq.setMainUIInlineStyle({
    ...NAVIGATOR_INLINE_STYLE,
    width: String(widthPx) + 'px',
  })
}

export const hideUI = (): void => {
  logseq.hideMainUI()
}

export const invokeSearch = async (): Promise<void> => {
  await logseq.App.invokeExternalCommand('logseq.go/search')
}

export const showMessage = (
  content: string,
  status: 'success' | 'warning' | 'error',
): void => {
  logseq.UI.showMsg(content, status)
}

export const provideKeyedStyle = (key: string, style: string): void => {
  logseq.provideStyle({ key: key, style: style })
}

export const getPluginId = (): string => {
  return logseq.baseInfo.id
}

export const checkCurrentIsDbGraph = async (): Promise<boolean> => {
  const isDbGraph = await logseq.App.checkCurrentIsDbGraph()
  return Boolean(isDbGraph)
}

export const getStringSetting = (key: string): string | null => {
  const settingsObject = logseq.settings
  if (settingsObject === undefined) {
    return null
  }
  const value = settingsObject[key]
  if (typeof value === 'string') {
    return value
  }
  return null
}

export const getNumberSetting = (key: string): number | null => {
  const settingsObject = logseq.settings
  if (settingsObject === undefined) {
    return null
  }
  const value = settingsObject[key]
  if (typeof value === 'number') {
    return value
  }
  return null
}
