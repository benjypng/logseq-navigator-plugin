export type Sort = 'updated' | 'created' | 'title'

export type NodeSelection = 'pages-and-blocks' | 'pages-only'

export interface NodePolicy {
  nodes: NodeSelection
  includeDescendantTags: boolean
  includeJournal: boolean
}

export type FolderKind = 'tag' | 'query' | 'page-refs'

export type FolderSource = 'auto' | 'config' | 'settings'

export interface TagFolderDef {
  id: string
  name: string
  kind: 'tag'
  tagUuid: string
  policy: NodePolicy
  source?: FolderSource
}

export interface PageRefsFolderDef {
  id: string
  name: string
  kind: 'page-refs'
  pageName: string
  policy: NodePolicy
  source?: FolderSource
}

export interface QueryFolderDef {
  id: string
  name: string
  kind: 'query'
  where?: string
  datalog?: string
  policy: NodePolicy
  source?: FolderSource
}

export type FolderDef = TagFolderDef | QueryFolderDef | PageRefsFolderDef

export interface TagInfo {
  uuid: string
  title: string
  ident: string | null
}

export interface NodeIdentity {
  uuid: string
  title: string
  updatedAt: number | null
  createdAt: number | null
  isPage: boolean
}

export interface Preview {
  uuid: string
  text: string
}

export interface FolderResult {
  resolvedAt: number
  nodes: NodeIdentity[]
  previews: Map<string, Preview>
}

export interface Bookmark {
  uuid: string
  title: string
  isPage: boolean
}

export interface NavigatorConfig {
  bookmarks: Bookmark[]
  pinnedByFolder: Map<string, string[]>
  width: number
  folderWidth: number
}

export interface AppState {
  folders: FolderDef[]
  bookmarks: Bookmark[]
  tagCounts: Map<string, number>

  pinnedByFolder: Map<string, string[]>
  selectedFolderId: string | null
  selectedNodeUuid: string | null
  sort: Sort
  filter: string
  width: number
  folderWidth: number
  resultCache: Map<string, FolderResult>
}

export interface DateGroup {
  label: string
  nodes: NodeIdentity[]
}

export interface PulledNode {
  ':block/uuid'?: string
  ':block/title'?: string

  ':block/name'?: string

  ':block/created-at'?: number
  ':block/updated-at'?: number
  ':logseq.property/updated-at'?: number
  ':logseq.property/created-at'?: number
}
