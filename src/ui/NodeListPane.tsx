import { useVirtualizer } from '@tanstack/react-virtual'
import {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  DATE_GROUP_LABEL_PINNED,
  VIRTUAL_HEADER_HEIGHT,
  VIRTUAL_OVERSCAN,
  VIRTUAL_ROW_HEIGHT,
} from '../constants'
import { hydrateWindow } from '../data/hydrate'
import {
  addPageTag,
  createPage,
  navigateToNode,
  openInRightSidebar,
  showMessage,
} from '../logseq/api'
import { togglePin } from '../state/actions'
import {
  mergePreviews,
  selectNode,
  setFilter,
  useAppState,
} from '../state/store'
import type {
  DateGroup,
  FolderDef,
  FolderResult,
  NodeIdentity,
  Sort,
} from '../types'
import { filterNodes, groupNodes, sortNodes } from './grouping'
import { NodeRow } from './NodeRow'
import { SortMenu } from './SortMenu'

type FlatRow =
  | { kind: 'header'; label: string }
  | { kind: 'node'; node: NodeIdentity }

const rowKey = (row: FlatRow): string => {
  if (row.kind === 'header') {
    return 'h:' + row.label
  }
  return 'n:' + row.node.uuid
}

const flattenGroups = (groups: DateGroup[]): FlatRow[] => {
  const rows: FlatRow[] = []
  groups.forEach((eachGroup) => {
    rows.push({ kind: 'header', label: eachGroup.label })
    eachGroup.nodes.forEach((eachNode) => {
      rows.push({ kind: 'node', node: eachNode })
    })
  })
  return rows
}

const findNodeByUuid = (
  nodes: NodeIdentity[],
  uuid: string,
): NodeIdentity | null => {
  for (const eachNode of nodes) {
    if (eachNode.uuid === uuid) {
      return eachNode
    }
  }
  return null
}

const getPinnedUuids = (
  pinnedByFolder: Map<string, string[]>,
  folderId: string,
): string[] => {
  const list = pinnedByFolder.get(folderId)
  if (list === undefined) {
    return []
  }
  return list
}

const SearchIcon = (): ReactElement => {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.5-4.5" />
    </svg>
  )
}

const HashIcon = (): ReactElement => {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  )
}

const NewNoteIcon = (): ReactElement => {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

interface NodeListHeaderProps {
  sort: Sort
  filter: string
  folderName: string
  noteCount: number
  onTitleClick: (() => void) | null
  isTagFolder: boolean
  onCreateNote: (name: string) => void
}

const notesLabel = (count: number): string => {
  return count === 1 ? '1 note' : String(count) + ' notes'
}

const NodeListHeader = (props: NodeListHeaderProps): ReactElement => {
  const [isCreating, setIsCreating] = useState<boolean>(false)
  const [draft, setDraft] = useState<string>('')
  const createInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (isCreating === true) {
      createInputRef.current?.focus()
    }
  }, [isCreating])

  const closeCreate = (): void => {
    setIsCreating(false)
    setDraft('')
  }

  const submitCreate = (): void => {
    const name = draft.trim()
    if (name.length === 0) {
      return
    }
    props.onCreateNote(name)
    closeCreate()
  }

  const handleCreateKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ): void => {
    if (event.key === 'Enter') {
      event.preventDefault()
      submitCreate()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      closeCreate()
    }
  }

  const handleFilterChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setFilter(event.target.value)
  }
  const onTitleClick = props.onTitleClick
  return (
    <div className="navigator-node-header">
      <div className="navigator-node-header-top">
        <span className="navigator-title-tile" aria-hidden="true">
          <HashIcon />
        </span>
        {onTitleClick === null ? (
          <span className="navigator-node-title-label" title={props.folderName}>
            {props.folderName}
          </span>
        ) : (
          <button
            type="button"
            className="navigator-node-title-label navigator-node-title-link"
            title={'Go to ' + props.folderName}
            onClick={onTitleClick}
          >
            {props.folderName}
          </button>
        )}
        <span className="navigator-notes-count">
          {notesLabel(props.noteCount)}
        </span>
        {props.isTagFolder === true ? (
          isCreating === true ? (
            <input
              ref={createInputRef}
              className="navigator-new-note-input"
              type="text"
              placeholder="New note title…"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value)
              }}
              onKeyDown={handleCreateKeyDown}
              onBlur={closeCreate}
            />
          ) : (
            <button
              type="button"
              className="navigator-new-note"
              title={'New note tagged ' + props.folderName}
              aria-label={'New note tagged ' + props.folderName}
              onClick={() => {
                setIsCreating(true)
              }}
            >
              <NewNoteIcon />
            </button>
          )
        ) : null}
      </div>
      <div className="navigator-sort-row">
        <span className="navigator-sort-by-label">Sort by</span>
        <SortMenu sort={props.sort} />
      </div>
      <div className="navigator-filter-wrap">
        <span className="navigator-filter-icon">
          <SearchIcon />
        </span>
        <input
          className="navigator-filter-input"
          type="text"
          placeholder="Filter…"
          value={props.filter}
          onChange={handleFilterChange}
        />
      </div>
    </div>
  )
}

export const NodeListPane = (): ReactElement => {
  const state = useAppState()
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const activeResult: FolderResult | undefined =
    state.selectedFolderId === null
      ? undefined
      : state.resultCache.get(state.selectedFolderId)

  const pinnedUuids: string[] =
    state.selectedFolderId === null
      ? []
      : getPinnedUuids(state.pinnedByFolder, state.selectedFolderId)
  const pinnedKey = pinnedUuids.join(',')
  const pinnedSet = new Set<string>(pinnedUuids)

  const flatRows = useMemo<FlatRow[]>(() => {
    if (activeResult === undefined) {
      return []
    }
    const filtered = filterNodes(activeResult.nodes, state.filter)
    const sorted = sortNodes(filtered, state.sort)
    const pinned: NodeIdentity[] = []
    const rest: NodeIdentity[] = []
    sorted.forEach((eachNode) => {
      if (pinnedSet.has(eachNode.uuid)) {
        pinned.push(eachNode)
      } else {
        rest.push(eachNode)
      }
    })
    const rows: FlatRow[] = []
    if (pinned.length > 0) {
      rows.push({ kind: 'header', label: DATE_GROUP_LABEL_PINNED })
      pinned.forEach((eachNode) => {
        rows.push({ kind: 'node', node: eachNode })
      })
    }
    const groups = groupNodes(rest, state.sort, Date.now())
    flattenGroups(groups).forEach((eachRow) => {
      rows.push(eachRow)
    })
    return rows
  }, [activeResult, state.filter, state.sort, pinnedKey])

  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => {
      return scrollRef.current
    },
    getItemKey: (index) => {
      const row = flatRows[index]
      if (row === undefined) {
        return index
      }
      return rowKey(row)
    },
    estimateSize: (index) => {
      const row = flatRows[index]
      if (row !== undefined && row.kind === 'header') {
        return VIRTUAL_HEADER_HEIGHT
      }
      return VIRTUAL_ROW_HEIGHT
    },
    overscan: VIRTUAL_OVERSCAN,
  })

  const virtualItems = virtualizer.getVirtualItems()

  const visibleNodeUuids = useMemo<string[]>(() => {
    const uuids: string[] = []
    virtualItems.forEach((eachItem) => {
      const row = flatRows[eachItem.index]
      if (row !== undefined && row.kind === 'node') {
        uuids.push(row.node.uuid)
      }
    })
    return uuids
  }, [virtualItems, flatRows])

  const visibleKey = visibleNodeUuids.join(',')

  useEffect(() => {
    if (state.selectedFolderId === null) {
      return
    }
    if (activeResult === undefined) {
      return
    }
    const folderId = state.selectedFolderId
    const nodesToHydrate: NodeIdentity[] = []
    visibleNodeUuids.forEach((eachUuid) => {
      if (activeResult.previews.has(eachUuid) === false) {
        const node = findNodeByUuid(activeResult.nodes, eachUuid)
        if (node !== null) {
          nodesToHydrate.push(node)
        }
      }
    })
    if (nodesToHydrate.length === 0) {
      return
    }
    let cancelled = false
    hydrateWindow(nodesToHydrate)
      .then((previews) => {
        if (cancelled === false) {
          mergePreviews(folderId, previews)
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [visibleKey, state.selectedFolderId, activeResult])

  const handleSelectNode = (uuid: string, openInSidebar: boolean): void => {
    selectNode(uuid)
    if (openInSidebar) {
      openInRightSidebar(uuid)
      return
    }
    navigateToNode(uuid)
  }

  const handleTogglePin = (uuid: string): void => {
    if (state.selectedFolderId === null) {
      return
    }
    togglePin(state.selectedFolderId, uuid)
  }

  if (state.selectedFolderId === null) {
    return (
      <div className="navigator-node-pane">
        <div className="navigator-empty">Select a folder.</div>
      </div>
    )
  }

  let selectedFolder: FolderDef | null = null
  for (const eachFolder of state.folders) {
    if (eachFolder.id === state.selectedFolderId) {
      selectedFolder = eachFolder
    }
  }
  const folderName = selectedFolder === null ? '' : selectedFolder.name

  let titleTarget: string | null = null
  if (selectedFolder !== null && selectedFolder.kind === 'tag') {
    titleTarget = selectedFolder.tagUuid
  } else if (selectedFolder !== null && selectedFolder.kind === 'page-refs') {
    titleTarget = selectedFolder.pageName
  }
  const handleTitleClick =
    titleTarget === null
      ? null
      : (): void => {
          navigateToNode(titleTarget)
        }

  const noteCount =
    activeResult === undefined
      ? 0
      : filterNodes(activeResult.nodes, state.filter).length

  const tagFolder =
    selectedFolder !== null && selectedFolder.kind === 'tag'
      ? selectedFolder
      : null

  const handleCreateNote = (name: string): void => {
    if (tagFolder === null) {
      return
    }
    const tagUuid = tagFolder.tagUuid
    createPage(name)
      .then(async (page) => {
        if (page === null) {
          showMessage('Could not create page', 'error')
          return
        }
        await addPageTag(page.uuid, tagUuid)
        navigateToNode(page.uuid)
      })
      .catch(() => {
        showMessage('Could not create page', 'error')
      })
  }

  return (
    <div className="navigator-node-pane">
      <NodeListHeader
        sort={state.sort}
        filter={state.filter}
        folderName={folderName}
        noteCount={noteCount}
        onTitleClick={handleTitleClick}
        isTagFolder={tagFolder !== null}
        onCreateNote={handleCreateNote}
      />
      <div className="navigator-node-scroll" ref={scrollRef}>
        <div
          className="navigator-virtual-spacer"
          style={{
            height: virtualizer.getTotalSize() + 'px',
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((eachItem) => {
            const row = flatRows[eachItem.index]
            if (row === undefined) {
              return null
            }

            const style = {
              position: 'absolute' as const,
              top: 0,
              left: 0,
              width: '100%',
              transform: 'translateY(' + eachItem.start + 'px)',
            }
            if (row.kind === 'header') {
              return (
                <div
                  key={eachItem.key}
                  data-index={eachItem.index}
                  ref={virtualizer.measureElement}
                  className="navigator-date-group"
                  style={style}
                >
                  <span className="navigator-date-label">{row.label}</span>
                  <span className="navigator-date-rule" />
                </div>
              )
            }
            const preview =
              activeResult === undefined
                ? undefined
                : activeResult.previews.get(row.node.uuid)
            return (
              <div
                key={eachItem.key}
                data-index={eachItem.index}
                ref={virtualizer.measureElement}
                style={style}
              >
                <NodeRow
                  node={row.node}
                  preview={preview}
                  isSelected={row.node.uuid === state.selectedNodeUuid}
                  isPinned={pinnedSet.has(row.node.uuid)}
                  onSelect={handleSelectNode}
                  onTogglePin={handleTogglePin}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
