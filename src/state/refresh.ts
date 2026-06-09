import { DEFAULT_DEBOUNCE_MS } from '../constants'
import { getNumberSetting, onDbChanged } from '../logseq/api'
import { refreshAfterDbChange } from './actions'

const getDebounceMs = (): number => {
  const fromSettings = getNumberSetting('debounceMs')
  if (fromSettings !== null && fromSettings > 0) {
    return fromSettings
  }
  return DEFAULT_DEBOUNCE_MS
}

export const startDbRefresh = (): (() => void) => {
  let timer: ReturnType<typeof setTimeout> | undefined = undefined
  let pendingUuids = new Set<string>()
  const off = onDbChanged((changedUuids) => {
    changedUuids.forEach((eachUuid) => {
      pendingUuids.add(eachUuid)
    })
    if (timer !== undefined) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      const uuids = Array.from(pendingUuids)
      pendingUuids = new Set<string>()
      void refreshAfterDbChange(uuids)
    }, getDebounceMs())
  })
  return () => {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
    off()
  }
}
