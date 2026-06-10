import { getPluginId, provideKeyedStyle, setMainUIWidth } from '../logseq/api'

const DOCK_STYLE_KEY = 'navigator-dock'

// The plugin owns the rail's width and visibility. The margin reserved on
// #root is ALWAYS derived from these two values, so it can never desync from
// what's on screen (the earlier bug came from reading logseq.isMainUIVisible,
// a getter that lags the actual toggle).
let railWidth = 0
let railVisible = false

const buildDockStyle = (mainContainerId: string): string => {
  // The iframe is position:fixed (set via setMainUIInlineStyle), so it never
  // pushes #root itself — this margin is the ONLY thing reserving its space.
  // Hidden → 0 margin → app reclaims full width, no empty band.
  const margin = railVisible ? String(railWidth) + 'px' : '0px'
  return `
    div#${mainContainerId} {
      background: var(--ls-primary-background-color);
      border-right: 1px solid var(--lx-gray-09, #333);
    }

    div#root {
      margin-left: ${margin} !important;
      width: calc(100% - ${margin}) !important;
    }

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

// Resize the rail and reflow Logseq in lockstep. Re-applies the margin only if
// the rail is currently visible.
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

// Catch visibility changes triggered outside our helpers (e.g. Logseq's own
// keybinding) so the margin stays in sync no matter how the UI was toggled.
export const startDockVisibilitySync = (): (() => void) => {
  const handler = (payload: { visible: boolean }): void => {
    setRailVisible(payload.visible)
  }
  logseq.on('ui:visible:changed', handler)
  return () => {
    logseq.off('ui:visible:changed', handler)
  }
}
