import {
  type ReactElement,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
} from 'react'

import {
  MAX_FOLDER_WIDTH,
  MAX_PANE_WIDTH,
  MIN_FOLDER_WIDTH,
  MIN_PANE_WIDTH,
} from '../constants'
import { hideRail, setRailWidth } from '../dock/dock-stub'
import { invokeSearch } from '../logseq/api'
import {
  loadFolders,
  resizeFolderWidth,
  resizePaneWidth,
} from '../state/actions'
import { setFolderWidth, useAppState } from '../state/store'
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

const CloseIcon = (): ReactElement => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  )
}

export const App = (): ReactElement => {
  const state = useAppState()
  const draggingRef = useRef(false)
  const folderDraggingRef = useRef(false)
  useEffect(() => {
    void loadFolders()
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
  const handleClose = (): void => {
    hideRail()
  }
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
  // The folder pane starts at the rail's left edge, so clientX is the divider's
  // distance from that edge — i.e. the folder pane width.
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
  return (
    <div className="navigator-root">
      <button
        type="button"
        className="navigator-close-button"
        onClick={handleClose}
        title="Close navigator"
        aria-label="Close navigator"
      >
        <CloseIcon />
      </button>
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
