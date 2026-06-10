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

  // Logseq's left sidebar is a position:fixed drawer pinned to the viewport's
  // left edge, so #root's margin doesn't move it — without this it slides in
  // *underneath* the rail. Shift it to start at the rail's right edge so the
  // order is rail · left sidebar · main · right sidebar. Only while visible;
  // when hidden we leave it untouched so it returns to left:0.
  const leftSidebarShift = railVisible
    ? `div#left-sidebar { left: ${margin} !important; }`
    : ''

  // The header reserves 78px on the left for the macOS traffic-light buttons.
  // Once the rail covers that corner, the gutter is wasted — collapse it to
  // 10px. Only while visible, so the gutter returns when the rail is closed.
  // The 78px macOS traffic-light gutter is `.is-electron.is-mac .cp__header>.l`
  // (the .l row inside #head). Collapse it to 10px while the rail covers that
  // corner; !important + the #head id outweighs the original rule.
  const headerGutter = railVisible
    ? `div#head > .l { padding-left: 10px !important; }`
    : ''

  return `
    div#${mainContainerId} {
      background: var(--ls-primary-background-color);
      border-right: 1px solid var(--lx-gray-09, #333);
    }

    div#root {
      margin-left: ${margin} !important;
      width: calc(100% - ${margin}) !important;
    }

    ${leftSidebarShift}

    ${headerGutter}

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
