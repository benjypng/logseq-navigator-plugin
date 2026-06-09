import { getPluginId, provideKeyedStyle } from '../logseq/api'

const DOCK_STYLE_KEY = 'navigator-dock'

const buildDockStyle = (mainContainerId: string): string => {
  return `
    body {
      display: flex !important;
      flex-direction: row !important;
      height: 100vh !important;
      overflow: hidden !important;
    }

    div#root {
      flex: 1 !important;
      overflow-y: auto !important;
      min-width: 0 !important;
    }

    div#${mainContainerId} {
      flex-shrink: 0 !important;
      height: 100% !important;
      position: relative !important;
      top: auto !important;
      left: auto !important;
      overflow-y: auto !important;
      background: var(--ls-primary-background-color);
      border-right: 1px solid var(--lx-gray-09, #333);
      order: -1;
    }

    div.preboot-loading {
      display: none !important;
    }
  `
}

export const applyDock = (): void => {
  const mainContainerId = getPluginId() + '_lsp_main'
  provideKeyedStyle(DOCK_STYLE_KEY, buildDockStyle(mainContainerId))
}

export const restoreDock = (): void => {
  provideKeyedStyle(DOCK_STYLE_KEY, '')
}
