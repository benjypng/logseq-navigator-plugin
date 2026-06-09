import '@logseq/libs'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import {
  NAVIGATOR_COMMAND_KEY,
  NAVIGATOR_COMMAND_LABEL,
  NAVIGATOR_INLINE_STYLE,
  NAVIGATOR_KEYBINDING,
} from './constants'
import { applyDock, restoreDock } from './dock/dock-stub'
import {
  checkCurrentIsDbGraph,
  registerBlockBookmarkMenu,
  registerPageBookmarkMenu,
  showMessage,
} from './logseq/api'
import { settings } from './settings'
import { bookmarkBlock, bookmarkPage } from './state/actions'
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
      logseq.toggleMainUI()
    },
  )
}

const main = async (): Promise<void> => {
  const isDbGraph = await checkCurrentIsDbGraph()
  if (isDbGraph === false) {
    showMessage(
      'Navigator supports DB graphs only. The plugin is inactive on this file graph.',
      'warning',
    )
    return
  }

  applyDock()

  logseq.setMainUIInlineStyle(NAVIGATOR_INLINE_STYLE)
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

  logseq.beforeunload(async () => {
    stopSelectionSync()
    stopDbRefresh()
    restoreDock()
  })
}

logseq
  .useSettingsSchema(settings)
  .ready(main)
  .catch(() => undefined)
