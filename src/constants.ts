import type { NodePolicy, Sort } from './types'

export const NAVIGATOR_COMMAND_KEY = 'logseq-navigator-plugin'
export const NAVIGATOR_COMMAND_LABEL = 'Navigator: Toggle'
export const NAVIGATOR_KEYBINDING = {
  mode: 'global' as const,
  binding: 'mod+shift+l',
}

export const NAVIGATOR_INLINE_STYLE = {
  position: 'fixed' as const,
  zIndex: 11,
  top: '0',
  left: '0',
  right: 'auto' as const,
  bottom: '0',
  width: '40rem',
  height: '100%',
}

export const DEFAULT_PANE_WIDTH = 640
export const MIN_PANE_WIDTH = 320
export const MAX_PANE_WIDTH = 1200

export const DEFAULT_FOLDER_WIDTH = 224
export const MIN_FOLDER_WIDTH = 160
export const MAX_FOLDER_WIDTH = 480

export const DEFAULT_CONFIG_PAGE_NAME = 'Navigator/Config'

export const PAGE_REFS_FOLDER_PREFIX = 'page-refs:'

export const DEFAULT_DEBOUNCE_MS = 400

export const SORT_UPDATED: Sort = 'updated'
export const SORT_CREATED: Sort = 'created'
export const SORT_TITLE: Sort = 'title'
export const DEFAULT_SORT: Sort = SORT_UPDATED

export const DEFAULT_NODE_POLICY: NodePolicy = {
  nodes: 'pages-and-blocks',
  includeDescendantTags: false,
  includeJournal: false,
}

export const VIRTUAL_ROW_HEIGHT = 104
export const VIRTUAL_HEADER_HEIGHT = 28
export const VIRTUAL_OVERSCAN = 8

export const ONE_DAY_MS = 86400000

export const PREVIEW_CHILD_COUNT = 2

export const PREVIEW_MAX_LENGTH = 160

export const DATE_GROUP_LABEL_PINNED = 'Pinned'

export const DATE_GROUP_LABEL_TODAY = 'Today'
export const DATE_GROUP_LABEL_YESTERDAY = 'Yesterday'
export const DATE_GROUP_LABEL_LAST_SEVEN_DAYS = 'Previous 7 days'
export const DATE_GROUP_LABEL_LAST_THIRTY_DAYS = 'Previous 30 days'
export const DATE_GROUP_LABEL_OLDER = 'Older'
export const DATE_GROUP_LABEL_UNKNOWN = 'Undated'

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const CONFIG_FENCE_OPEN = '```json'
export const CONFIG_FENCE_CLOSE = '```'
