import type { ReactElement } from 'react'

import { navigateToNode } from '../logseq/api'
import {
  removeBookmark,
  removePageRefFolder,
  selectAndResolveFolder,
} from '../state/actions'
import { useAppState } from '../state/store'
import type { Bookmark, FolderDef } from '../types'

const kindGlyph = (kind: FolderDef['kind']): string => {
  if (kind === 'tag') {
    return '#'
  }
  if (kind === 'page-refs') {
    return '↳'
  }
  return '?'
}

interface FolderRowProps {
  folder: FolderDef
  isSelected: boolean
  count: number | undefined
  onSelect: (folderId: string) => void
}

const FolderRow = (props: FolderRowProps): ReactElement => {
  const handleClick = (): void => {
    props.onSelect(props.folder.id)
  }
  const className = props.isSelected
    ? 'navigator-folder-row navigator-folder-row-selected'
    : 'navigator-folder-row'
  return (
    <li className="navigator-folder-item">
      <button type="button" className={className} onClick={handleClick}>
        <span className="navigator-folder-kind">
          {kindGlyph(props.folder.kind)}
        </span>
        <span className="navigator-folder-name">{props.folder.name}</span>
        {props.count === undefined ? null : (
          <span className="navigator-folder-count">{props.count}</span>
        )}
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
        <span className="navigator-folder-kind">{glyph}</span>
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
        <span className="navigator-folder-kind">
          {kindGlyph(props.folder.kind)}
        </span>
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
): { tags: FolderDef[]; pageRefs: FolderDef[]; queries: FolderDef[] } => {
  const tags: FolderDef[] = []
  const pageRefs: FolderDef[] = []
  const queries: FolderDef[] = []
  folders.forEach((eachFolder) => {
    if (eachFolder.kind === 'tag') {
      tags.push(eachFolder)
    } else if (eachFolder.kind === 'page-refs') {
      pageRefs.push(eachFolder)
    } else {
      queries.push(eachFolder)
    }
  })
  return { tags: tags, pageRefs: pageRefs, queries: queries }
}

export const FolderPane = (): ReactElement => {
  const state = useAppState()

  const handleSelect = (folderId: string): void => {
    void selectAndResolveFolder(folderId)
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

  const partitioned = partitionFolders(state.folders)

  return (
    <div
      className="navigator-folder-pane"
      style={{ width: String(state.folderWidth) + 'px' }}
    >
      <div className="navigator-folder-section">
        <div className="navigator-section-header">
          <span className="navigator-pane-header">Bookmarks</span>
          {state.bookmarks.length > 0 ? (
            <span className="navigator-pane-header-count">
              {state.bookmarks.length}
            </span>
          ) : null}
        </div>
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
      </div>

      <div className="navigator-folder-section">
        <div className="navigator-section-header">
          <span className="navigator-pane-header">Tags</span>
          {partitioned.tags.length > 0 ? (
            <span className="navigator-pane-header-count">
              {partitioned.tags.length}
            </span>
          ) : null}
        </div>
        {partitioned.tags.length === 0 ? (
          <div className="navigator-empty">No tags found.</div>
        ) : (
          <ul className="navigator-folder-list">
            {partitioned.tags.map((eachFolder) => {
              return (
                <FolderRow
                  key={eachFolder.id}
                  folder={eachFolder}
                  isSelected={eachFolder.id === state.selectedFolderId}
                  count={
                    eachFolder.kind === 'tag'
                      ? state.tagCounts.get(eachFolder.tagUuid)
                      : undefined
                  }
                  onSelect={handleSelect}
                />
              )
            })}
          </ul>
        )}
      </div>

      <div className="navigator-folder-section">
        <div className="navigator-section-header">
          <span className="navigator-pane-header">Page References</span>
          {partitioned.pageRefs.length > 0 ? (
            <span className="navigator-pane-header-count">
              {partitioned.pageRefs.length}
            </span>
          ) : null}
        </div>
        {partitioned.pageRefs.length === 0 ? (
          <div className="navigator-empty">
            Right-click a page → Navigator: Add as Page Reference.
          </div>
        ) : (
          <ul className="navigator-folder-list">
            {partitioned.pageRefs.map((eachFolder) => {
              return (
                <PageRefRow
                  key={eachFolder.id}
                  folder={eachFolder}
                  isSelected={eachFolder.id === state.selectedFolderId}
                  count={state.pageRefCounts.get(eachFolder.id)}
                  onSelect={handleSelect}
                  onRemove={handleRemovePageRef}
                />
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
