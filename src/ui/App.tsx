import {
  type ReactElement,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
} from 'react'

import { MAX_PANE_WIDTH, MIN_PANE_WIDTH } from '../constants'
import { hideUI, invokeSearch, setMainUIWidth } from '../logseq/api'
import { loadFolders, resizePaneWidth } from '../state/actions'
import { useAppState } from '../state/store'
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

export const App = (): ReactElement => {
  const state = useAppState()
  const draggingRef = useRef(false)
  useEffect(() => {
    void loadFolders()
  }, [])
  useEffect(() => {
    setMainUIWidth(state.width)
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
    hideUI()
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
    setMainUIWidth(clampWidth(event.clientX))
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
