import { getPluginId, provideKeyedStyle, setMainUIWidth } from '../logseq/api'

const DOCK_STYLE_KEY = 'navigator-dock'

let railWidth = 0
let railVisible = false

const buildDockStyle = (mainContainerId: string): string => {
  const margin = railVisible ? String(railWidth) + 'px' : '0px'

  const leftSidebarShift = railVisible
    ? `div#left-sidebar { left: ${margin} !important; }`
    : ''

  const headerGutter = railVisible
    ? `div#head > .l { padding-left: 10px !important; }`
    : ''

  const toastFix = railVisible
    ? `div.ui__notifications { left: 0 !important; right: 0 !important; width: auto !important; }`
    : ''

  return `
    div#${mainContainerId} {
      background: var(--ls-primary-background-color);
    }

    div#root {
      margin-left: ${margin} !important;
      width: calc(100% - ${margin}) !important;
    }

    ${leftSidebarShift}

    ${headerGutter}

    ${toastFix}

    div.preboot-loading {
      display: none !important;
    }
  `
}

const refreshDock = (): void => {
  const mainContainerId = getPluginId() + '_lsp_main'
  provideKeyedStyle(DOCK_STYLE_KEY, buildDockStyle(mainContainerId))
}

export const restoreDock = (): void => {
  provideKeyedStyle(DOCK_STYLE_KEY, '')
}

export const setRailWidth = (widthPx: number): void => {
  railWidth = widthPx
  setMainUIWidth(widthPx)
  refreshDock()
}

const setRailVisible = (visible: boolean): void => {
  railVisible = visible
  refreshDock()
}

export const showRail = (): void => {
  logseq.showMainUI()
  setRailVisible(true)
}

export const hideRail = (): void => {
  logseq.hideMainUI()
  setRailVisible(false)
}

export const toggleRail = (): void => {
  if (railVisible) {
    hideRail()
  } else {
    showRail()
  }
}

export const startDockVisibilitySync = (): (() => void) => {
  const handler = (payload: { visible: boolean }): void => {
    setRailVisible(payload.visible)
  }
  logseq.on('ui:visible:changed', handler)
  return () => {
    logseq.off('ui:visible:changed', handler)
  }
}
