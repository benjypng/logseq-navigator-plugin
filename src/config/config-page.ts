import type { BlockEntity, PageEntity } from '@logseq/libs/dist/LSPlugin.user'

import {
  CONFIG_FENCE_CLOSE,
  CONFIG_FENCE_OPEN,
  DEFAULT_CONFIG_PAGE_NAME,
  DEFAULT_PANE_WIDTH,
  MAX_PANE_WIDTH,
  MIN_PANE_WIDTH,
} from '../constants'
import {
  appendBlockInPage,
  createPage,
  getPage,
  getPageBlocksTree,
  getPagesFromNamespace,
  getStringSetting,
  updateBlock,
} from '../logseq/api'
import type { Bookmark, NavigatorConfig } from '../types'

export const getConfigPageName = (): string => {
  const fromSettings = getStringSetting('configPageName')
  if (fromSettings !== null && fromSettings.trim().length > 0) {
    return fromSettings.trim()
  }
  return DEFAULT_CONFIG_PAGE_NAME
}

const serializeConfig = (config: NavigatorConfig): unknown => {
  const pins: Record<string, string[]> = {}
  config.pinnedByFolder.forEach((uuids, folderId) => {
    pins[folderId] = uuids
  })
  return {
    bookmarks: config.bookmarks,
    pins: pins,
    width: config.width,
  }
}

const clampWidth = (value: number): number => {
  if (value < MIN_PANE_WIDTH) {
    return MIN_PANE_WIDTH
  }
  if (value > MAX_PANE_WIDTH) {
    return MAX_PANE_WIDTH
  }
  return value
}

const validateWidth = (value: unknown): number => {
  if (typeof value !== 'number' || Number.isFinite(value) === false) {
    return DEFAULT_PANE_WIDTH
  }
  return clampWidth(Math.round(value))
}

const buildFencedJson = (config: NavigatorConfig): string => {
  const json = JSON.stringify(serializeConfig(config), null, 2)
  return CONFIG_FENCE_OPEN + '\n' + json + '\n' + CONFIG_FENCE_CLOSE
}

const resolveConfigPage = async (name: string): Promise<PageEntity | null> => {
  const direct = await getPage(name)
  if (direct !== null) {
    return direct
  }
  if (name.includes('/') === false) {
    return null
  }
  const segments = name.split('/')
  const leaf = segments[segments.length - 1]
  const namespace = segments.slice(0, segments.length - 1).join('/')
  if (leaf === undefined || leaf.length === 0 || namespace.length === 0) {
    return null
  }
  const leafLower = leaf.toLowerCase()
  const namespacePages = await getPagesFromNamespace(namespace)
  for (const eachPage of namespacePages) {
    const pageName =
      typeof eachPage.name === 'string' ? eachPage.name.toLowerCase() : ''
    if (pageName === leafLower || pageName.endsWith('/' + leafLower)) {
      return eachPage
    }
  }
  const byLeaf = await getPage(leaf)
  if (byLeaf !== null) {
    return byLeaf
  }
  return null
}

const looksLikeConfig = (title: string): boolean => {
  const trimmed = title.trim()
  if (trimmed.includes(CONFIG_FENCE_OPEN)) {
    return true
  }
  if (trimmed.startsWith('[')) {
    return true
  }
  if (trimmed.startsWith('{')) {
    return true
  }
  return false
}

const findConfigBlock = async (
  pageIdentifier: string,
): Promise<BlockEntity | null> => {
  const blocks = await getPageBlocksTree(pageIdentifier)
  if (blocks.length === 0) {
    return null
  }
  for (const eachBlock of blocks) {
    if (
      typeof eachBlock.title === 'string' &&
      looksLikeConfig(eachBlock.title)
    ) {
      return eachBlock
    }
  }
  const firstBlock = blocks[0]
  if (firstBlock === undefined) {
    return null
  }
  return firstBlock
}

const extractJsonText = (blockTitle: string): string => {
  const openIndex = blockTitle.indexOf(CONFIG_FENCE_OPEN)
  if (openIndex === -1) {
    return blockTitle.trim()
  }
  const afterOpen = blockTitle.slice(openIndex + CONFIG_FENCE_OPEN.length)
  const closeIndex = afterOpen.lastIndexOf(CONFIG_FENCE_CLOSE)
  if (closeIndex === -1) {
    return afterOpen.trim()
  }
  return afterOpen.slice(0, closeIndex).trim()
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object') {
    return false
  }
  if (value === null) {
    return false
  }
  if (Array.isArray(value)) {
    return false
  }
  return true
}

const validateBookmarks = (value: unknown): Bookmark[] => {
  if (Array.isArray(value) === false) {
    return []
  }
  const bookmarks: Bookmark[] = []
  const seen = new Set<string>()
  value.forEach((eachEntry) => {
    if (isRecord(eachEntry) === false) {
      return
    }
    const record = eachEntry as Record<string, unknown>
    const uuid = record['uuid']
    if (typeof uuid !== 'string' || uuid.length === 0 || seen.has(uuid)) {
      return
    }
    seen.add(uuid)
    const title = record['title']
    bookmarks.push({
      uuid: uuid,
      title: typeof title === 'string' ? title : uuid,
      isPage: record['isPage'] === true,
    })
  })
  return bookmarks
}

const validatePins = (value: unknown): Map<string, string[]> => {
  const map = new Map<string, string[]>()
  if (isRecord(value) === false) {
    return map
  }
  Object.keys(value).forEach((folderId) => {
    const list = value[folderId]
    if (Array.isArray(list) === false) {
      return
    }
    const uuids: string[] = []
    list.forEach((eachUuid) => {
      if (typeof eachUuid === 'string') {
        uuids.push(eachUuid)
      }
    })
    map.set(folderId, uuids)
  })
  return map
}

const emptyConfig = (): NavigatorConfig => {
  return {
    bookmarks: [],
    pinnedByFolder: new Map<string, string[]>(),
    width: DEFAULT_PANE_WIDTH,
  }
}

const parseConfig = (jsonText: string): NavigatorConfig => {
  if (jsonText.length === 0) {
    return emptyConfig()
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return emptyConfig()
  }
  // Legacy format: a bare array of bookmarks with no pins.
  if (Array.isArray(parsed)) {
    return {
      bookmarks: validateBookmarks(parsed),
      pinnedByFolder: new Map<string, string[]>(),
      width: DEFAULT_PANE_WIDTH,
    }
  }
  if (isRecord(parsed) === false) {
    return emptyConfig()
  }
  return {
    bookmarks: validateBookmarks(parsed['bookmarks']),
    pinnedByFolder: validatePins(parsed['pins']),
    width: validateWidth(parsed['width']),
  }
}

export const readConfig = async (): Promise<NavigatorConfig> => {
  const pageName = getConfigPageName()
  const page = await resolveConfigPage(pageName)
  if (page === null) {
    return emptyConfig()
  }
  const block = await findConfigBlock(page.uuid)
  if (block === null || typeof block.title !== 'string') {
    return emptyConfig()
  }
  return parseConfig(extractJsonText(block.title))
}

export const writeConfig = async (config: NavigatorConfig): Promise<void> => {
  const pageName = getConfigPageName()
  let page = await resolveConfigPage(pageName)
  if (page === null) {
    await createPage(pageName)
    page = await resolveConfigPage(pageName)
  }
  if (page === null) {
    return
  }
  const content = buildFencedJson(config)
  const block = await findConfigBlock(page.uuid)
  if (block === null) {
    await appendBlockInPage(page.uuid, content)
    return
  }
  await updateBlock(block.uuid, content)
}
