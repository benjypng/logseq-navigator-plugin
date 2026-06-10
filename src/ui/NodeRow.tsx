import type { MouseEvent, ReactElement } from 'react'

import type { NodeIdentity, Preview } from '../types'

interface NodeRowProps {
  node: NodeIdentity
  preview: Preview | undefined
  isSelected: boolean
  isPinned: boolean
  onSelect: (uuid: string) => void
  onTogglePin: (uuid: string) => void
}

const PageIcon = (): ReactElement => {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
    </svg>
  )
}

const BlockIcon = (): ReactElement => {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="M5 6v.01" />
      <path d="M5 12v.01" />
      <path d="M5 18v.01" />
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
    year: 'numeric',
  })
}

const PinIcon = (props: { filled: boolean }): ReactElement => {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={props.filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
    </svg>
  )
}

export const NodeRow = (props: NodeRowProps): ReactElement => {
  const handleClick = (): void => {
    props.onSelect(props.node.uuid)
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
  const kindClassName = props.node.isPage
    ? 'navigator-node-icon navigator-node-icon-page'
    : 'navigator-node-icon navigator-node-icon-block'
  const kindTitle = props.node.isPage ? 'Page' : 'Block'
  const pinClassName = props.isPinned
    ? 'navigator-node-pin navigator-node-pin-active'
    : 'navigator-node-pin'
  return (
    <div className={className} onClick={handleClick}>
      <span className={kindClassName} title={kindTitle}>
        {props.node.isPage ? <PageIcon /> : <BlockIcon />}
      </span>
      <div className="navigator-node-text">
        <div className="navigator-node-title">{titleText}</div>
        <div className="navigator-node-preview">{previewText}</div>
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
