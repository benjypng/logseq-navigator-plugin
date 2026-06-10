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
  startDockVisibilitySync,
  toggleRail,
} from './dock/dock-stub'
import {
  checkCurrentIsDbGraph,
  registerBlockBookmarkMenu,
  registerPageBookmarkMenu,
  showMessage,
} from './logseq/api'
import { settings } from './settings'
import { bookmarkBlock, bookmarkPage } from './state/actions'
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
  // Force a known closed state on load: Logseq may restore the iframe as
  // visible across reloads, which would leave railVisible out of sync (margin
  // 0 while the rail paints over #root). Start hidden; first toggle opens it.
  hideRail()
  mountApp()
  registerToggleCommand()

  registerBlockBookmarkMenu((uuid) => {
    void bookmarkBlock(uuid)
  })
  registerPageBookmarkMenu((pageName) => {
    void bookmarkPage(pageName)
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
