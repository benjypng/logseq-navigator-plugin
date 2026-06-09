import { useSyncExternalStore } from 'react'

import { DEFAULT_PANE_WIDTH, DEFAULT_SORT } from '../constants'
import type {
  AppState,
  Bookmark,
  FolderDef,
  FolderResult,
  Preview,
  Sort,
} from '../types'

type Listener = () => void

const createInitialState = (): AppState => {
  return {
    folders: [],
    bookmarks: [],
    pinnedByFolder: new Map<string, string[]>(),
    selectedFolderId: null,
    selectedNodeUuid: null,
    sort: DEFAULT_SORT,
    filter: '',
    width: DEFAULT_PANE_WIDTH,
    resultCache: new Map<string, FolderResult>(),
  }
}

let currentState: AppState = createInitialState()
const listeners = new Set<Listener>()

const emit = (): void => {
  listeners.forEach((eachListener) => {
    eachListener()
  })
}

const subscribe = (listener: Listener): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getState = (): AppState => {
  return currentState
}

const commitPatch = (patch: Partial<AppState>): void => {
  const nextState: AppState = Object.assign({}, currentState, patch)
  currentState = nextState
  emit()
}

export const setFolders = (folders: FolderDef[]): void => {
  commitPatch({ folders: folders })
}

export const resetGraphState = (): void => {
  commitPatch({
    folders: [],
    bookmarks: [],
    pinnedByFolder: new Map<string, string[]>(),
    selectedFolderId: null,
    selectedNodeUuid: null,
    filter: '',
    resultCache: new Map<string, FolderResult>(),
  })
}

export const setBookmarks = (bookmarks: Bookmark[]): void => {
  commitPatch({ bookmarks: bookmarks })
}

export const setPinnedByFolder = (
  pinnedByFolder: Map<string, string[]>,
): void => {
  commitPatch({ pinnedByFolder: pinnedByFolder })
}

export const selectFolder = (folderId: string): void => {
  commitPatch({ selectedFolderId: folderId, selectedNodeUuid: null })
}

export const selectNode = (uuid: string): void => {
  if (currentState.selectedNodeUuid === uuid) {
    return
  }
  commitPatch({ selectedNodeUuid: uuid })
}

export const clearSelection = (): void => {
  if (currentState.selectedNodeUuid === null) {
    return
  }
  commitPatch({ selectedNodeUuid: null })
}

export const clearFolderSelection = (): void => {
  if (
    currentState.selectedFolderId === null &&
    currentState.selectedNodeUuid === null
  ) {
    return
  }
  commitPatch({ selectedFolderId: null, selectedNodeUuid: null })
}

export const setSort = (sort: Sort): void => {
  commitPatch({ sort: sort })
}

export const setFilter = (filter: string): void => {
  commitPatch({ filter: filter })
}

export const setWidth = (width: number): void => {
  commitPatch({ width: width })
}

export const putResult = (folderId: string, result: FolderResult): void => {
  const nextCache = new Map(currentState.resultCache)
  nextCache.set(folderId, result)
  commitPatch({ resultCache: nextCache })
}

export const mergePreviews = (folderId: string, previews: Preview[]): void => {
  const existing = currentState.resultCache.get(folderId)
  if (existing === undefined) {
    return
  }
  const nextPreviews = new Map(existing.previews)
  previews.forEach((eachPreview) => {
    nextPreviews.set(eachPreview.uuid, eachPreview)
  })
  const nextResult: FolderResult = {
    resolvedAt: existing.resolvedAt,
    nodes: existing.nodes,
    previews: nextPreviews,
  }
  putResult(folderId, nextResult)
}

export const useAppState = (): AppState => {
  return useSyncExternalStore(subscribe, getState)
}
