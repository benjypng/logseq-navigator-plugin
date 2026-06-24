import type { BlockEntity } from '@logseq/libs/dist/LSPlugin.user'

import {
  getLinkedReferencePages,
  getTagObjects,
  runDatascriptQuery,
} from '../logseq/api'
import type {
  FolderDef,
  NodeIdentity,
  NodePolicy,
  QueryFolderDef,
} from '../types'
import {
  buildNodeQuery,
  buildTitleLookupQuery,
  extractRefUuids,
  normaliseResult,
  resolveRefTokens,
} from './queries'
import { getTagIdentifier, subclassClosure } from './tags'

const TITLE_LOOKUP_CHUNK = 150

const lookupRefTitles = async (
  uuids: string[],
): Promise<Map<string, string>> => {
  const titleByUuid = new Map<string, string>()
  for (let start = 0; start < uuids.length; start += TITLE_LOOKUP_CHUNK) {
    const chunk = uuids.slice(start, start + TITLE_LOOKUP_CHUNK)
    let rows: unknown
    try {
      rows = await runDatascriptQuery<unknown>(buildTitleLookupQuery(chunk))
    } catch {
      continue
    }
    if (Array.isArray(rows) === false) {
      continue
    }
    rows.forEach((eachRow) => {
      if (Array.isArray(eachRow) === false) {
        return
      }
      const uuid = eachRow[0]
      const title = eachRow[1]
      if (typeof uuid === 'string' && typeof title === 'string') {
        titleByUuid.set(uuid.toLowerCase(), title)
      }
    })
  }
  return titleByUuid
}

const resolveRefTitles = async (
  identities: NodeIdentity[],
): Promise<NodeIdentity[]> => {
  const needed = new Set<string>()
  identities.forEach((eachIdentity) => {
    extractRefUuids(eachIdentity.title).forEach((eachUuid) => {
      needed.add(eachUuid)
    })
  })
  if (needed.size === 0) {
    return identities
  }
  const titleByUuid = await lookupRefTitles([...needed])
  if (titleByUuid.size === 0) {
    return identities
  }
  return identities.map((eachIdentity) => {
    const resolved = resolveRefTokens(eachIdentity.title, titleByUuid)
    if (resolved === eachIdentity.title) {
      return eachIdentity
    }
    return { ...eachIdentity, title: resolved }
  })
}

const asRecord = (value: BlockEntity): Record<string, unknown> => {
  return value as unknown as Record<string, unknown>
}

const isPageEntity = (entity: BlockEntity): boolean => {
  return typeof asRecord(entity).name === 'string'
}

const isJournalEntity = (entity: BlockEntity): boolean => {
  const record = asRecord(entity)
  if (typeof record.journalDay === 'number') {
    return true
  }
  if (record['journal?'] === true) {
    return true
  }
  const page = record.page
  if (typeof page === 'object' && page !== null) {
    const pageRecord = page as Record<string, unknown>
    if (typeof pageRecord.journalDay === 'number') {
      return true
    }
    if (pageRecord['journal?'] === true) {
      return true
    }
  }
  return false
}

const objectsToIdentities = (
  objects: BlockEntity[],
  policy: NodePolicy,
): NodeIdentity[] => {
  const identities: NodeIdentity[] = []
  const seen = new Set<string>()
  objects.forEach((eachObject) => {
    const uuid = eachObject.uuid
    if (typeof uuid !== 'string' || seen.has(uuid)) {
      return
    }
    const pageNode = isPageEntity(eachObject)
    if (policy.nodes === 'pages-only' && pageNode === false) {
      return
    }
    if (policy.includeJournal === false && isJournalEntity(eachObject)) {
      return
    }
    seen.add(uuid)
    const record = asRecord(eachObject)
    let title = ''
    if (typeof record.fullTitle === 'string') {
      title = record.fullTitle
    } else if (typeof eachObject.title === 'string') {
      title = eachObject.title
    } else if (typeof record.originalName === 'string') {
      title = record.originalName
    } else if (typeof record.name === 'string') {
      title = record.name
    }
    const createdAt =
      typeof eachObject.createdAt === 'number' ? eachObject.createdAt : null
    const updatedAt =
      typeof eachObject.updatedAt === 'number' ? eachObject.updatedAt : null
    identities.push({
      uuid: uuid,
      title: title,
      createdAt: createdAt,
      updatedAt: updatedAt,
      isPage: pageNode,
    })
  })
  return identities
}

const collectIdentifiers = async (
  tagUuid: string,
  includeDescendants: boolean,
): Promise<string[]> => {
  const identifiers: string[] = []
  const rootIdentifier = getTagIdentifier(tagUuid)
  if (rootIdentifier !== null) {
    identifiers.push(rootIdentifier)
  }
  if (includeDescendants === false) {
    return identifiers
  }
  try {
    const closure = await subclassClosure(tagUuid)
    closure.forEach((eachUuid) => {
      if (eachUuid === tagUuid) {
        return
      }
      const identifier = getTagIdentifier(eachUuid)
      if (identifier !== null && identifiers.includes(identifier) === false) {
        identifiers.push(identifier)
      }
    })
  } catch {
    return identifiers
  }
  return identifiers
}

const resolveTagFolder = async (
  tagUuid: string,
  policy: NodePolicy,
): Promise<NodeIdentity[]> => {
  const identifiers = await collectIdentifiers(
    tagUuid,
    policy.includeDescendantTags,
  )
  if (identifiers.length === 0) {
    return []
  }
  const allObjects: BlockEntity[] = []
  for (const eachIdentifier of identifiers) {
    const objects = await getTagObjects(eachIdentifier)
    objects.forEach((eachObject) => {
      allObjects.push(eachObject)
    })
  }

  return objectsToIdentities(allObjects, policy)
}

const buildQueryFolderQuery = (folder: QueryFolderDef): string | null => {
  if (typeof folder.where === 'string' && folder.where.trim().length > 0) {
    return buildNodeQuery(folder.where.trim())
  }
  if (typeof folder.datalog === 'string' && folder.datalog.trim().length > 0) {
    return folder.datalog.trim()
  }
  return null
}

const resolveQueryFolder = async (
  folder: QueryFolderDef,
): Promise<NodeIdentity[]> => {
  const query = buildQueryFolderQuery(folder)
  if (query === null) {
    return []
  }
  const rows = await runDatascriptQuery<unknown>(query)
  const identities = normaliseResult(rows)

  return identities
}

const resolvePageRefsFolder = async (
  pageName: string,
  policy: NodePolicy,
): Promise<NodeIdentity[]> => {
  const pages = await getLinkedReferencePages(pageName)
  return objectsToIdentities(pages as unknown as BlockEntity[], policy)
}

export const resolveFolder = async (
  folder: FolderDef,
): Promise<NodeIdentity[]> => {
  if (folder.kind === 'tag') {
    return await resolveRefTitles(
      await resolveTagFolder(folder.tagUuid, folder.policy),
    )
  }
  if (folder.kind === 'page-refs') {
    return await resolveRefTitles(
      await resolvePageRefsFolder(folder.pageName, folder.policy),
    )
  }
  return await resolveRefTitles(await resolveQueryFolder(folder))
}
