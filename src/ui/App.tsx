import {
  type ReactElement,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  MAX_FOLDER_WIDTH,
  MAX_PANE_WIDTH,
  MIN_FOLDER_WIDTH,
  MIN_PANE_WIDTH,
} from '../constants'
import { waitForGraphReady } from '../data/tags'
import { setRailWidth } from '../dock/dock-stub'
import { getThemeMode, invokeSearch, onThemeModeChanged } from '../logseq/api'
import {
  loadFolders,
  resizeFolderWidth,
  resizePaneWidth,
} from '../state/actions'
import { setFolderWidth, setLoading, useAppState } from '../state/store'
import { FolderPane } from './FolderPane'
import { NodeListPane } from './NodeListPane'

const clampWidth = (value: number): number => {
  if (value < MIN_PANE_WIDTH) {
    return MIN_PANE_WIDTH
  }
  if (value > MAX_PANE_WIDTH) {
    return MAX_PANE_WIDTH
  }
  return value
}

const clampFolderWidth = (value: number): number => {
  if (value < MIN_FOLDER_WIDTH) {
    return MIN_FOLDER_WIDTH
  }
  if (value > MAX_FOLDER_WIDTH) {
    return MAX_FOLDER_WIDTH
  }
  return value
}

export const App = (): ReactElement => {
  const state = useAppState()
  const draggingRef = useRef(false)
  const folderDraggingRef = useRef(false)
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light')
  useEffect(() => {
    const bootstrap = async (): Promise<void> => {
      await waitForGraphReady()
      await loadFolders()
      setLoading(false)
    }
    void bootstrap()
  }, [])
  useEffect(() => {
    void getThemeMode().then((mode) => {
      setColorScheme(mode)
    })
    const cleanup = onThemeModeChanged((mode) => {
      setColorScheme(mode)
    })
    return () => {
      cleanup()
    }
  }, [])
  useEffect(() => {
    setRailWidth(state.width)
  }, [state.width])
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        void invokeSearch()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
  const handleResizePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ): void => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    draggingRef.current = true
  }
  const handleResizePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ): void => {
    if (draggingRef.current === false) {
      return
    }
    setRailWidth(clampWidth(event.clientX))
  }
  const handleResizePointerUp = (
    event: ReactPointerEvent<HTMLDivElement>,
  ): void => {
    if (draggingRef.current === false) {
      return
    }
    draggingRef.current = false
    event.currentTarget.releasePointerCapture(event.pointerId)
    void resizePaneWidth(clampWidth(event.clientX))
  }
  const handleFolderResizePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ): void => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    folderDraggingRef.current = true
  }
  const handleFolderResizePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ): void => {
    if (folderDraggingRef.current === false) {
      return
    }
    setFolderWidth(clampFolderWidth(event.clientX))
  }
  const handleFolderResizePointerUp = (
    event: ReactPointerEvent<HTMLDivElement>,
  ): void => {
    if (folderDraggingRef.current === false) {
      return
    }
    folderDraggingRef.current = false
    event.currentTarget.releasePointerCapture(event.pointerId)
    void resizeFolderWidth(clampFolderWidth(event.clientX))
  }
  if (state.isLoading) {
    return (
      <div className="navigator-root" data-theme={colorScheme}>
        <div className="navigator-loading">
          <div className="navigator-loading-spinner" />
          <span className="navigator-loading-label">Loading graph…</span>
        </div>
      </div>
    )
  }
  return (
    <div className="navigator-root" data-theme={colorScheme}>
      <FolderPane />
      <div
        className="navigator-folder-resize-handle"
        onPointerDown={handleFolderResizePointerDown}
        onPointerMove={handleFolderResizePointerMove}
        onPointerUp={handleFolderResizePointerUp}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize folder pane"
      />
      <NodeListPane />
      <div
        className="navigator-resize-handle"
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize navigator"
      />
    </div>
  )
}
