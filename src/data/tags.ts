import type { PageEntity } from '@logseq/libs/dist/LSPlugin.user'

import { getAllTags, runDatascriptQuery } from '../logseq/api'
import type { TagInfo } from '../types'
import { isValidUuid, normaliseIdent } from './queries'

const tagIdentifierByUuid = new Map<string, string>()

export const getTagIdentifier = (uuid: string): string | null => {
  const identifier = tagIdentifierByUuid.get(uuid)
  if (identifier === undefined) {
    return null
  }
  return identifier
}

export const enumerateTags = async (): Promise<TagInfo[]> => {
  const pages = await getAllTags()

  const tags: TagInfo[] = []
  const seen = new Set<string>()
  tagIdentifierByUuid.clear()
  pages.forEach((eachPage: PageEntity) => {
    const uuid = eachPage.uuid
    if (typeof uuid !== 'string' || seen.has(uuid)) {
      return
    }
    seen.add(uuid)
    const rawIdent = typeof eachPage.ident === 'string' ? eachPage.ident : null
    const name = typeof eachPage.name === 'string' ? eachPage.name : null
    const titleField =
      typeof eachPage.title === 'string' && eachPage.title.length > 0
        ? eachPage.title
        : null
    let displayTitle = uuid
    if (titleField !== null) {
      displayTitle = titleField
    } else if (name !== null) {
      displayTitle = name
    }

    let identifier: string | null = null
    if (rawIdent !== null) {
      identifier = rawIdent
    } else if (name !== null) {
      identifier = name
    }
    if (identifier !== null) {
      tagIdentifierByUuid.set(uuid, identifier)
    }
    tags.push({
      uuid: uuid,
      title: displayTitle,
      ident: rawIdent === null ? null : normaliseIdent(rawIdent),
    })
  })
  tags.sort((left, right) => {
    return left.title.localeCompare(right.title)
  })
  return tags
}

export const enumerateTagCounts = async (): Promise<Map<string, number>> => {
  // Count non-journal objects per tag in a single grouped query, so the folder
  // list can show a page count without resolving every folder upfront.
  const query =
    '[:find ?tagUuid (count ?node)\n :where\n [?node :block/tags ?tag]\n [?tag :block/uuid ?tagUuid]\n (not [?node :block/journal-day ?journalDay])]'
  const counts = new Map<string, number>()
  try {
    const rows = await runDatascriptQuery<[string, number][]>(query)
    rows.forEach((eachRow) => {
      const tagUuid = eachRow[0]
      const count = eachRow[1]
      if (typeof tagUuid === 'string' && typeof count === 'number') {
        counts.set(tagUuid, count)
      }
    })
  } catch {
    return counts
  }
  return counts
}

const queryDirectSubclasses = async (parentUuid: string): Promise<string[]> => {
  if (isValidUuid(parentUuid) === false) {
    return []
  }
  const query = `[:find ?childUuid :where [?parent :block/uuid #uuid "${parentUuid}"] [?child :logseq.property.class/extends ?parent] [?child :block/uuid ?childUuid]]`
  const rows = await runDatascriptQuery<string[][]>(query)
  const childUuids: string[] = []
  rows.forEach((eachRow) => {
    const childUuid = eachRow[0]
    if (typeof childUuid === 'string') {
      childUuids.push(childUuid)
    }
  })
  return childUuids
}

export const subclassClosure = async (rootUuid: string): Promise<string[]> => {
  if (isValidUuid(rootUuid) === false) {
    return []
  }
  const discovered = new Set<string>()
  discovered.add(rootUuid)
  let frontier: string[] = [rootUuid]
  while (frontier.length > 0) {
    const nextFrontier: string[] = []
    for (const parentUuid of frontier) {
      const children = await queryDirectSubclasses(parentUuid)
      children.forEach((eachChildUuid) => {
        if (discovered.has(eachChildUuid) === false) {
          discovered.add(eachChildUuid)
          nextFrontier.push(eachChildUuid)
        }
      })
    }
    frontier = nextFrontier
  }
  return Array.from(discovered)
}
