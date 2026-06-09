import { readConfig, writeConfig } from '../config/config-page'
import {
  DEFAULT_NODE_POLICY,
  MAX_PANE_WIDTH,
  MIN_PANE_WIDTH,
} from '../constants'
import { resolveFolder } from '../data/resolve'
import { enumerateTags } from '../data/tags'
import { getBlockWithChildren, getPage, showMessage } from '../logseq/api'
import type {
  Bookmark,
  FolderDef,
  FolderResult,
  NodeIdentity,
  Preview,
  TagInfo,
} from '../types'
import {
  clearFolderSelection,
  getState,
  putResult,
  resetGraphState,
  selectFolder,
  setBookmarks,
  setFolders,
  setPinnedByFolder,
  setWidth,
} from './store'

const isUserDefinedTag = (ident: string | null): boolean => {
  if (ident === null) {
    return true
  }
  return ident.startsWith('logseq.') === false
}

const tagToFolder = (tag: TagInfo): FolderDef => {
  return {
    id: 'tag:' + tag.uuid,
    name: tag.title,
    kind: 'tag',
    tagUuid: tag.uuid,
    source: 'auto',
    policy: {
      nodes: DEFAULT_NODE_POLICY.nodes,
      includeDescendantTags: DEFAULT_NODE_POLICY.includeDescendantTags,
      includeJournal: DEFAULT_NODE_POLICY.includeJournal,
    },
  }
}

const buildTagFolders = (tags: TagInfo[]): FolderDef[] => {
  const folders: FolderDef[] = []
  tags.forEach((eachTag) => {
    if (isUserDefinedTag(eachTag.ident)) {
      folders.push(tagToFolder(eachTag))
    }
  })
  return folders
}

const findFolder = (folderId: string): FolderDef | null => {
  const state = getState()
  for (const eachFolder of state.folders) {
    if (eachFolder.id === folderId) {
      return eachFolder
    }
  }
  return null
}

export const resolveActiveFolder = async (
  folderId: string,
  preservePreviews: boolean,
): Promise<void> => {
  const folder = findFolder(folderId)
  if (folder === null) {
    return
  }
  const nodes = await resolveFolder(folder)
  const existing = getState().resultCache.get(folderId)
  let previews = new Map<string, Preview>()
  if (preservePreviews && existing !== undefined) {
    previews = existing.previews
  }
  const result: FolderResult = {
    resolvedAt: Date.now(),
    nodes: nodes,
    previews: previews,
  }
  putResult(folderId, result)
}

export const selectAndResolveFolder = async (
  folderId: string,
): Promise<void> => {
  selectFolder(folderId)
  await resolveActiveFolder(folderId, true)
}

export const loadConfig = async (): Promise<void> => {
  try {
    const config = await readConfig()
    setBookmarks(config.bookmarks)
    setPinnedByFolder(config.pinnedByFolder)
    setWidth(config.width)
  } catch {
    setBookmarks([])
    setPinnedByFolder(new Map<string, string[]>())
  }
}

const persistConfig = async (): Promise<void> => {
  const state = getState()
  await writeConfig({
    bookmarks: state.bookmarks,
    pinnedByFolder: state.pinnedByFolder,
    width: state.width,
  })
}

export const resizePaneWidth = async (width: number): Promise<void> => {
  let clamped = Math.round(width)
  if (clamped < MIN_PANE_WIDTH) {
    clamped = MIN_PANE_WIDTH
  }
  if (clamped > MAX_PANE_WIDTH) {
    clamped = MAX_PANE_WIDTH
  }
  if (clamped === getState().width) {
    return
  }
  setWidth(clamped)
  await persistConfig()
}

export const loadFolders = async (): Promise<void> => {
  let tags: TagInfo[] = []
  try {
    tags = await enumerateTags()
  } catch {
    tags = []
  }
  const folders = buildTagFolders(tags)
  setFolders(folders)
  await loadConfig()
  const state = getState()
  if (state.selectedFolderId === null && folders.length > 0) {
    const firstFolder = folders[0]
    if (firstFolder !== undefined) {
      await selectAndResolveFolder(firstFolder.id)
    }
  }
}

export const reloadForGraphChange = async (): Promise<void> => {
  resetGraphState()
  await loadFolders()
}

const addBookmark = async (bookmark: Bookmark): Promise<void> => {
  const current = getState().bookmarks
  for (const eachBookmark of current) {
    if (eachBookmark.uuid === bookmark.uuid) {
      showMessage('Already bookmarked: ' + bookmark.title, 'warning')
      return
    }
  }
  const next: Bookmark[] = []
  current.forEach((eachBookmark) => {
    next.push(eachBookmark)
  })
  next.push(bookmark)
  setBookmarks(next)
  await persistConfig()
  showMessage('Bookmarked: ' + bookmark.title, 'success')
}

export const bookmarkBlock = async (uuid: string): Promise<void> => {
  const block = await getBlockWithChildren(uuid)
  const title =
    block !== null && typeof block.title === 'string' ? block.title : uuid
  await addBookmark({ uuid: uuid, title: title, isPage: false })
}

export const bookmarkPage = async (pageName: string): Promise<void> => {
  const page = await getPage(pageName)
  if (page === null) {
    return
  }
  let title = pageName
  if (typeof page.title === 'string' && page.title.length > 0) {
    title = page.title
  } else if (typeof page.name === 'string' && page.name.length > 0) {
    title = page.name
  }
  await addBookmark({ uuid: page.uuid, title: title, isPage: true })
}

export const removeBookmark = async (uuid: string): Promise<void> => {
  const current = getState().bookmarks
  const next: Bookmark[] = []
  current.forEach((eachBookmark) => {
    if (eachBookmark.uuid !== uuid) {
      next.push(eachBookmark)
    }
  })
  setBookmarks(next)
  await persistConfig()
}

export const togglePin = (folderId: string, uuid: string): void => {
  const current = getState().pinnedByFolder
  const nextMap = new Map<string, string[]>(current)
  const existing = nextMap.get(folderId)
  const currentList = existing === undefined ? [] : existing
  const nextList: string[] = []
  let wasPinned = false
  currentList.forEach((eachUuid) => {
    if (eachUuid === uuid) {
      wasPinned = true
    } else {
      nextList.push(eachUuid)
    }
  })
  if (wasPinned === false) {
    nextList.push(uuid)
  }
  nextMap.set(folderId, nextList)
  setPinnedByFolder(nextMap)
  void persistConfig()
}

const nodesSignature = (nodes: NodeIdentity[]): string => {
  const parts: string[] = []
  nodes.forEach((eachNode) => {
    parts.push(
      eachNode.uuid +
        ':' +
        String(eachNode.updatedAt) +
        ':' +
        String(eachNode.createdAt) +
        ':' +
        eachNode.title,
    )
  })
  return parts.join('|')
}

const foldersSignature = (folders: FolderDef[]): string => {
  const parts: string[] = []
  folders.forEach((eachFolder) => {
    parts.push(eachFolder.id + ':' + eachFolder.name)
  })
  return parts.join('|')
}

export const refreshFolders = async (): Promise<void> => {
  let tags: TagInfo[] = []
  try {
    tags = await enumerateTags()
  } catch {
    tags = []
  }
  const folders = buildTagFolders(tags)
  const state = getState()
  if (foldersSignature(state.folders) === foldersSignature(folders)) {
    return
  }
  setFolders(folders)
  const selectedId = state.selectedFolderId
  let stillExists = false
  folders.forEach((eachFolder) => {
    if (eachFolder.id === selectedId) {
      stillExists = true
    }
  })
  if (stillExists) {
    return
  }
  const firstFolder = folders[0]
  if (firstFolder !== undefined) {
    await selectAndResolveFolder(firstFolder.id)
  } else {
    clearFolderSelection()
  }
}

export const refreshAfterDbChange = async (
  changedUuids: string[],
): Promise<void> => {
  await refreshFolders()
  await refreshActiveFolder(changedUuids)
}

export const refreshActiveFolder = async (
  changedUuids: string[],
): Promise<void> => {
  const folderId = getState().selectedFolderId
  if (folderId === null) {
    return
  }
  const folder = findFolder(folderId)
  if (folder === null) {
    return
  }
  const nodes = await resolveFolder(folder)
  const existing = getState().resultCache.get(folderId)
  if (
    existing !== undefined &&
    nodesSignature(existing.nodes) === nodesSignature(nodes)
  ) {
    return
  }
  let previews = new Map<string, Preview>()
  if (existing !== undefined) {
    previews = new Map<string, Preview>(existing.previews)
    changedUuids.forEach((eachUuid) => {
      previews.delete(eachUuid)
    })
  }
  putResult(folderId, {
    resolvedAt: Date.now(),
    nodes: nodes,
    previews: previews,
  })
}
