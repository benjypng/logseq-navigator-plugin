import '@logseq/libs'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import {
  DEFAULT_PANE_WIDTH,
  NAVIGATOR_COMMAND_KEY,
  NAVIGATOR_COMMAND_LABEL,
  NAVIGATOR_KEYBINDING,
} from './constants'
import {
  hideRail,
  restoreDock,
  setRailWidth,
  showRail,
  startDockVisibilitySync,
  toggleRail,
} from './dock/dock-stub'
import {
  checkCurrentIsDbGraph,
  getBooleanSetting,
  registerBlockBookmarkMenu,
  registerPageBookmarkMenu,
  registerPageRefsMenu,
  showMessage,
} from './logseq/api'
import { settings } from './settings'
import { addPageRef, bookmarkBlock, bookmarkPage } from './state/actions'
import { startGraphSync } from './state/graph-sync'
import { startDbRefresh } from './state/refresh'
import { startSelectionSync } from './state/selection-sync'
import { App } from './ui/App'
import './index.css'

const mountApp = (): void => {
  const container = document.getElementById('app')
  if (container === null) {
    return
  }
  const root = createRoot(container)
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

const registerToggleCommand = (): void => {
  logseq.App.registerCommandPalette(
    {
      key: NAVIGATOR_COMMAND_KEY,
      label: NAVIGATOR_COMMAND_LABEL,
      keybinding: NAVIGATOR_KEYBINDING,
    },
    async () => {
      toggleRail()
    },
  )
}

const TOOLBAR_ICON = `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <line x1="9" y1="4" x2="9" y2="20" />
    <line x1="5.5" y1="8" x2="7" y2="8" />
    <line x1="5.5" y1="12" x2="7" y2="12" />
    <line x1="5.5" y1="16" x2="7" y2="16" />
    <line x1="12" y1="9" x2="18" y2="9" />
    <line x1="12" y1="13" x2="18" y2="13" />
    <line x1="12" y1="17" x2="18" y2="17" />
  </svg>
`

const registerToolbarItem = (): void => {
  logseq.provideModel({
    toggleNavigator() {
      toggleRail()
    },
  })
  logseq.App.registerUIItem('toolbar', {
    key: 'navigator-toolbar',
    template: `
      <a class="button" data-on-click="toggleNavigator" title="Toggle Navigator">
        ${TOOLBAR_ICON}
      </a>
    `,
  })
}

const main = async (): Promise<void> => {
  logseq.UI.showMsg('logseq-navigator-plugin loaded', 'success')

  const isDbGraph = await checkCurrentIsDbGraph()
  if (isDbGraph === false) {
    showMessage(
      'Navigator supports DB graphs only. The plugin is inactive on this file graph.',
      'warning',
    )
    return
  }

  setRailWidth(DEFAULT_PANE_WIDTH)
  if (getBooleanSetting('openByDefault') ?? true) {
    showRail()
  } else {
    hideRail()
  }
  mountApp()
  registerToggleCommand()
  registerToolbarItem()

  registerBlockBookmarkMenu((uuid) => {
    void bookmarkBlock(uuid)
  })
  registerPageBookmarkMenu((pageName) => {
    void bookmarkPage(pageName)
  })
  registerPageRefsMenu((pageName) => {
    void addPageRef(pageName)
  })

  const stopSelectionSync = startSelectionSync()
  const stopDbRefresh = startDbRefresh()
  const stopGraphSync = startGraphSync()
  const stopDockVisibilitySync = startDockVisibilitySync()

  logseq.beforeunload(async () => {
    stopSelectionSync()
    stopDbRefresh()
    stopGraphSync()
    stopDockVisibilitySync()
    restoreDock()
  })
}

logseq
  .useSettingsSchema(settings)
  .ready(main)
  .catch(() => undefined)
