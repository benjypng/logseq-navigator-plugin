import { type ReactElement, useEffect } from 'react'

import { hideUI } from '../logseq/api'
import { loadFolders } from '../state/actions'
import { FolderPane } from './FolderPane'
import { NodeListPane } from './NodeListPane'

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
  useEffect(() => {
    void loadFolders()
  }, [])
  const handleClose = (): void => {
    hideUI()
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
    </div>
  )
}
