import { getCurrentEntity, onRouteChanged } from '../logseq/api'
import { clearSelection, getState, selectNode } from './store'

const activeFolderUuids = (): Set<string> => {
  const uuids = new Set<string>()
  const state = getState()
  if (state.selectedFolderId === null) {
    return uuids
  }
  const result = state.resultCache.get(state.selectedFolderId)
  if (result === undefined) {
    return uuids
  }
  result.nodes.forEach((eachNode) => {
    uuids.add(eachNode.uuid)
  })
  return uuids
}

const handleRouteChange = async (): Promise<void> => {
  const current = await getCurrentEntity()
  const currentUuid = current === null ? null : current.uuid
  if (currentUuid !== null && activeFolderUuids().has(currentUuid)) {
    selectNode(currentUuid)
    return
  }
  clearSelection()
}

export const startSelectionSync = (): (() => void) => {
  const off = onRouteChanged(() => {
    void handleRouteChange()
  })
  return off
}
