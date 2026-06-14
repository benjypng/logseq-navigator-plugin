import type { KeyboardEvent, MouseEvent, ReactElement } from 'react'

import type { NodeIdentity, Preview } from '../types'

interface NodeRowProps {
  node: NodeIdentity
  preview: Preview | undefined
  isSelected: boolean
  isPinned: boolean
  onSelect: (uuid: string, openInSidebar: boolean) => void
  onTogglePin: (uuid: string) => void
}

const FileIcon = (): ReactElement => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3h7l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M13 3v5h5" />
    </svg>
  )
}

const BlockBulletIcon = (): ReactElement => {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.42"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3.4" fill="currentColor" />
    </svg>
  )
}

const PinIcon = (props: { filled: boolean }): ReactElement => {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill={props.filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
    </svg>
  )
}

const formatDate = (ms: number | null): string => {
  if (ms === null) {
    return ''
  }
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export const NodeRow = (props: NodeRowProps): ReactElement => {
  const handleClick = (event: MouseEvent<HTMLDivElement>): void => {
    props.onSelect(props.node.uuid, event.shiftKey)
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      props.onSelect(props.node.uuid, event.shiftKey)
    }
  }
  const handleTogglePin = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation()
    props.onTogglePin(props.node.uuid)
  }
  const previewText = props.preview === undefined ? '' : props.preview.text
  const titleText =
    props.node.title.length > 0 ? props.node.title : '(untitled)'
  const dateText = formatDate(props.node.updatedAt ?? props.node.createdAt)
  const className = props.isSelected
    ? 'navigator-node-row navigator-node-row-selected'
    : 'navigator-node-row'
  const kindTitle = props.node.isPage ? 'Page' : 'Block'
  const pinClassName = props.isPinned
    ? 'navigator-node-pin navigator-node-pin-active'
    : 'navigator-node-pin'
  return (
    <div
      className={className}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <span className="navigator-node-icon" title={kindTitle}>
        {props.node.isPage ? <FileIcon /> : <BlockBulletIcon />}
      </span>
      <div className="navigator-node-text">
        <div className="navigator-node-title">{titleText}</div>
        {previewText.length > 0 ? (
          <div className="navigator-node-preview">{previewText}</div>
        ) : null}
        <div className="navigator-node-date">{dateText}</div>
      </div>
      <button
        type="button"
        className={pinClassName}
        title={props.isPinned ? 'Unpin' : 'Pin'}
        aria-label={props.isPinned ? 'Unpin' : 'Pin'}
        onClick={handleTogglePin}
      >
        <PinIcon filled={props.isPinned} />
      </button>
    </div>
  )
}
