import { useVirtualizer } from '@tanstack/react-virtual'
import {
  type ChangeEvent,
  type ReactElement,
  useEffect,
  useMemo,
  useRef,
} from 'react'

import {
  DATE_GROUP_LABEL_PINNED,
  SORT_CREATED,
  SORT_TITLE,
  SORT_UPDATED,
  VIRTUAL_HEADER_HEIGHT,
  VIRTUAL_OVERSCAN,
  VIRTUAL_ROW_HEIGHT,
} from '../constants'
import { hydrateWindow } from '../data/hydrate'
import { navigateToNode } from '../logseq/api'
import { togglePin } from '../state/actions'
import {
  mergePreviews,
  selectNode,
  setFilter,
  setSort,
  useAppState,
} from '../state/store'
import type { DateGroup, FolderResult, NodeIdentity, Sort } from '../types'
import { filterNodes, groupNodes, sortNodes } from './grouping'
import { NodeRow } from './NodeRow'

type FlatRow =
  | { kind: 'header'; label: string }
  | { kind: 'node'; node: NodeIdentity }

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

interface SortButtonProps {
  label: string
  value: Sort
  activeSort: Sort
}

const SortButton = (props: SortButtonProps): ReactElement => {
  const handleClick = (): void => {
    setSort(props.value)
  }
  const className =
    props.value === props.activeSort
      ? 'navigator-sort-button navigator-sort-button-active'
      : 'navigator-sort-button'
  return (
    <button type="button" className={className} onClick={handleClick}>
      {props.label}
    </button>
  )
}

const SearchIcon = (): ReactElement => {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

interface NodeListHeaderProps {
  sort: Sort
  filter: string
}

const NodeListHeader = (props: NodeListHeaderProps): ReactElement => {
  const handleFilterChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setFilter(event.target.value)
  }
  return (
    <div className="navigator-node-header">
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
      <div className="navigator-sort-buttons">
        <SortButton
          label="Updated"
          value={SORT_UPDATED}
          activeSort={props.sort}
        />
        <SortButton
          label="Created"
          value={SORT_CREATED}
          activeSort={props.sort}
        />
        <SortButton label="Title" value={SORT_TITLE} activeSort={props.sort} />
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

  const handleSelectNode = (uuid: string): void => {
    navigateToNode(uuid)
    selectNode(uuid)
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

  return (
    <div className="navigator-node-pane">
      <NodeListHeader sort={state.sort} filter={state.filter} />
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
              height: eachItem.size + 'px',
              overflow: 'hidden' as const,
              transform: 'translateY(' + eachItem.start + 'px)',
            }
            if (row.kind === 'header') {
              return (
                <div
                  key={'header-' + eachItem.index}
                  className="navigator-date-group"
                  style={style}
                >
                  {row.label}
                </div>
              )
            }
            const preview =
              activeResult === undefined
                ? undefined
                : activeResult.previews.get(row.node.uuid)
            return (
              <div key={row.node.uuid} style={style}>
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
