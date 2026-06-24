import { type ReactElement, type ReactNode, useState } from 'react'

import { hideRail } from '../dock/dock-stub'
import { navigateToNode } from '../logseq/api'
import {
  removeBookmark,
  removePageRefFolder,
  selectAndResolveFolder,
  toggleTagPin,
} from '../state/actions'
import { useAppState } from '../state/store'
import type { Bookmark, FolderDef } from '../types'
import { getCategoryColorVar, getTagCategory } from './tag-category'

const ChevronIcon = (): ReactElement => {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

const ArrowLeftIcon = (): ReactElement => {
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

const PinIcon = (props: { filled: boolean }): ReactElement => {
  return (
    <svg
      width="13"
      height="13"
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

interface SectionProps {
  label: string
  count: number
  open: boolean
  onToggle: () => void
  children: ReactNode
}

const Section = (props: SectionProps): ReactElement => {
  return (
    <div className="navigator-folder-section">
      <button
        type="button"
        className="navigator-section-toggle"
        aria-expanded={props.open}
        onClick={props.onToggle}
      >
        <span className="navigator-section-chevron">
          <ChevronIcon />
        </span>
        <span className="navigator-pane-header">{props.label}</span>
        <span className="navigator-pane-header-count">{props.count}</span>
      </button>
      {props.open ? props.children : null}
    </div>
  )
}

interface TagRowProps {
  folder: FolderDef
  isSelected: boolean
  isPinned: boolean
  count: number | undefined
  colorVar: string
  onSelect: (folderId: string) => void
  onTogglePin: (folderId: string) => void
}

const TagRow = (props: TagRowProps): ReactElement => {
  const handleClick = (): void => {
    props.onSelect(props.folder.id)
  }
  const handleTogglePin = (): void => {
    props.onTogglePin(props.folder.id)
  }
  const className = props.isSelected
    ? 'navigator-folder-row navigator-folder-row-selected'
    : 'navigator-folder-row'
  const pinClassName = props.isPinned
    ? 'navigator-folder-pin navigator-folder-pin-active'
    : 'navigator-folder-pin'
  return (
    <li className="navigator-folder-item navigator-tag-item">
      <button type="button" className={className} onClick={handleClick}>
        <span
          className="navigator-folder-dot"
          style={{ background: props.colorVar }}
        />
        <span className="navigator-folder-name">{props.folder.name}</span>
        {props.count === undefined || props.count === 0 ? null : (
          <span className="navigator-folder-count">{props.count}</span>
        )}
      </button>
      <button
        type="button"
        className={pinClassName}
        title={props.isPinned ? 'Unpin tag' : 'Pin tag'}
        aria-label={props.isPinned ? 'Unpin tag' : 'Pin tag'}
        onClick={handleTogglePin}
      >
        <PinIcon filled={props.isPinned} />
      </button>
    </li>
  )
}

interface BookmarkRowProps {
  bookmark: Bookmark
  onOpen: (uuid: string) => void
  onRemove: (uuid: string) => void
}

const BookmarkRow = (props: BookmarkRowProps): ReactElement => {
  const handleOpen = (): void => {
    props.onOpen(props.bookmark.uuid)
  }
  const handleRemove = (): void => {
    props.onRemove(props.bookmark.uuid)
  }
  const glyph = props.bookmark.isPage ? '¶' : '•'
  return (
    <li className="navigator-folder-item">
      <button
        type="button"
        className="navigator-folder-row"
        onClick={handleOpen}
      >
        <span className="navigator-folder-glyph">{glyph}</span>
        <span className="navigator-folder-name">{props.bookmark.title}</span>
      </button>
      <button
        type="button"
        className="navigator-folder-remove"
        title="Remove bookmark"
        aria-label="Remove bookmark"
        onClick={handleRemove}
      >
        ×
      </button>
    </li>
  )
}

interface PageRefRowProps {
  folder: FolderDef
  isSelected: boolean
  count: number | undefined
  colorVar: string
  onSelect: (folderId: string) => void
  onRemove: (folderId: string) => void
}

const PageRefRow = (props: PageRefRowProps): ReactElement => {
  const handleClick = (): void => {
    props.onSelect(props.folder.id)
  }
  const handleRemove = (): void => {
    props.onRemove(props.folder.id)
  }
  const className = props.isSelected
    ? 'navigator-folder-row navigator-folder-row-selected'
    : 'navigator-folder-row'
  return (
    <li className="navigator-folder-item navigator-pageref-item">
      <button type="button" className={className} onClick={handleClick}>
        <span
          className="navigator-folder-dot"
          style={{ background: props.colorVar }}
        />
        <span className="navigator-folder-name">{props.folder.name}</span>
        {props.count === undefined ? null : (
          <span className="navigator-folder-count">{props.count}</span>
        )}
      </button>
      <button
        type="button"
        className="navigator-folder-remove"
        title="Remove page reference"
        aria-label="Remove page reference"
        onClick={handleRemove}
      >
        ×
      </button>
    </li>
  )
}

const partitionFolders = (
  folders: FolderDef[],
): { tags: FolderDef[]; pageRefs: FolderDef[] } => {
  const tags: FolderDef[] = []
  const pageRefs: FolderDef[] = []
  folders.forEach((eachFolder) => {
    if (eachFolder.kind === 'tag') {
      tags.push(eachFolder)
    } else if (eachFolder.kind === 'page-refs') {
      pageRefs.push(eachFolder)
    }
  })
  return { tags: tags, pageRefs: pageRefs }
}

export const FolderPane = (): ReactElement => {
  const state = useAppState()
  const [bookmarksOpen, setBookmarksOpen] = useState(true)
  const [tagsOpen, setTagsOpen] = useState(true)
  const [refsOpen, setRefsOpen] = useState(true)

  const handleSelect = (folderId: string): void => {
    void selectAndResolveFolder(folderId)
  }
  const handleToggleTagPin = (folderId: string): void => {
    toggleTagPin(folderId)
  }
  const handleOpenBookmark = (uuid: string): void => {
    navigateToNode(uuid)
  }
  const handleRemoveBookmark = (uuid: string): void => {
    void removeBookmark(uuid)
  }
  const handleRemovePageRef = (folderId: string): void => {
    void removePageRefFolder(folderId)
  }
  const handleClose = (): void => {
    hideRail()
  }

  const partitioned = partitionFolders(state.folders)
  const pinnedTagSet = new Set<string>(state.pinnedTags)
  const pinnedTags = partitioned.tags.filter((eachFolder) => {
    return pinnedTagSet.has(eachFolder.id)
  })
  const restTags = partitioned.tags.filter((eachFolder) => {
    return pinnedTagSet.has(eachFolder.id) === false
  })

  const renderTagRow = (eachFolder: FolderDef): ReactElement => {
    const category = getTagCategory(eachFolder.name)
    return (
      <TagRow
        key={eachFolder.id}
        folder={eachFolder}
        isSelected={eachFolder.id === state.selectedFolderId}
        isPinned={pinnedTagSet.has(eachFolder.id)}
        count={
          eachFolder.kind === 'tag'
            ? state.tagCounts.get(eachFolder.tagUuid)
            : undefined
        }
        colorVar={getCategoryColorVar(category)}
        onSelect={handleSelect}
        onTogglePin={handleToggleTagPin}
      />
    )
  }

  return (
    <div
      className="navigator-folder-pane"
      style={{ width: String(state.folderWidth) + 'px' }}
    >
      <div className="navigator-railbar">
        <button
          type="button"
          className="navigator-close"
          title="Close navigator"
          aria-label="Close navigator"
          onClick={handleClose}
        >
          <ArrowLeftIcon />
        </button>
      </div>
      <div className="navigator-rail-scroll">
        <Section
          label="Bookmarks"
          count={state.bookmarks.length}
          open={bookmarksOpen}
          onToggle={() => {
            setBookmarksOpen((previous) => !previous)
          }}
        >
          {state.bookmarks.length === 0 ? (
            <div className="navigator-empty">
              Right-click a page or block → Navigator: Add as Bookmark.
            </div>
          ) : (
            <ul className="navigator-folder-list">
              {state.bookmarks.map((eachBookmark) => {
                return (
                  <BookmarkRow
                    key={eachBookmark.uuid}
                    bookmark={eachBookmark}
                    onOpen={handleOpenBookmark}
                    onRemove={handleRemoveBookmark}
                  />
                )
              })}
            </ul>
          )}
        </Section>

        <Section
          label="Tags"
          count={partitioned.tags.length}
          open={tagsOpen}
          onToggle={() => {
            setTagsOpen((previous) => !previous)
          }}
        >
          {partitioned.tags.length === 0 ? (
            <div className="navigator-empty">No tags found.</div>
          ) : (
            <ul className="navigator-folder-list">
              {pinnedTags.length === 0 ? null : (
                <li className="navigator-folder-grouphead" aria-hidden="true">
                  <span className="navigator-folder-grouplabel">Pinned</span>
                  <span className="navigator-folder-grouprule" />
                </li>
              )}
              {pinnedTags.map(renderTagRow)}
              {pinnedTags.length === 0 ? null : (
                <li
                  className="navigator-folder-groupdivider"
                  aria-hidden="true"
                />
              )}
              {restTags.map(renderTagRow)}
            </ul>
          )}
        </Section>

        <Section
          label="Page references"
          count={partitioned.pageRefs.length}
          open={refsOpen}
          onToggle={() => {
            setRefsOpen((previous) => !previous)
          }}
        >
          {partitioned.pageRefs.length === 0 ? (
            <div className="navigator-empty">
              Right-click a page → Navigator: Add as Page Reference.
            </div>
          ) : (
            <ul className="navigator-folder-list">
              {partitioned.pageRefs.map((eachFolder) => {
                const category = getTagCategory(eachFolder.name)
                return (
                  <PageRefRow
                    key={eachFolder.id}
                    folder={eachFolder}
                    isSelected={eachFolder.id === state.selectedFolderId}
                    count={state.pageRefCounts.get(eachFolder.id)}
                    colorVar={getCategoryColorVar(category)}
                    onSelect={handleSelect}
                    onRemove={handleRemovePageRef}
                  />
                )
              })}
            </ul>
          )}
        </Section>
      </div>

      <div className="navigator-rail-footer">
        <span className="navigator-rail-footer-text">
          {partitioned.tags.length} tags · {partitioned.pageRefs.length} refs
        </span>
      </div>
    </div>
  )
}
