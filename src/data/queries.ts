import { UUID_PATTERN } from '../constants'
import type { NodeIdentity, NodePolicy, PulledNode } from '../types'

const PHASE_ONE_PULL =
  '(pull ?node [:block/uuid :block/title :block/name :block/created-at :block/updated-at :logseq.property/updated-at :logseq.property/created-at])'

export const buildNodeQuery = (whereClause: string): string => {
  return '[:find ' + PHASE_ONE_PULL + '\n :where\n ' + whereClause + ']'
}

export const isValidUuid = (value: string): boolean => {
  return UUID_PATTERN.test(value)
}

export const readAttr = (pulled: PulledNode, attr: string): unknown => {
  const record = pulled as Record<string, unknown>
  const withColon = record[':' + attr]
  if (withColon !== undefined) {
    return withColon
  }
  const exact = record[attr]
  if (exact !== undefined) {
    return exact
  }
  const slashIndex = attr.lastIndexOf('/')
  if (slashIndex !== -1) {
    const leaf = attr.slice(slashIndex + 1)
    const leafValue = record[leaf]
    if (leafValue !== undefined) {
      return leafValue
    }
  }
  return undefined
}

export const normaliseIdent = (ident: string): string => {
  if (ident.startsWith(':')) {
    return ident.slice(1)
  }
  return ident
}

const pickNumber = (primary: unknown, fallback: unknown): number | null => {
  if (typeof primary === 'number') {
    return primary
  }
  if (typeof fallback === 'number') {
    return fallback
  }
  return null
}

export const pulledNodeToIdentity = (
  pulled: PulledNode,
): NodeIdentity | null => {
  const uuid = readAttr(pulled, 'block/uuid')
  if (typeof uuid !== 'string') {
    return null
  }
  const title = readAttr(pulled, 'block/title')
  const updatedAt = pickNumber(
    readAttr(pulled, 'block/updated-at'),
    readAttr(pulled, 'logseq.property/updated-at'),
  )
  const createdAt = pickNumber(
    readAttr(pulled, 'block/created-at'),
    readAttr(pulled, 'logseq.property/created-at'),
  )

  const blockName = readAttr(pulled, 'block/name')
  return {
    uuid: uuid,
    title: typeof title === 'string' ? title : '',
    updatedAt: updatedAt,
    createdAt: createdAt,
    isPage: typeof blockName === 'string',
  }
}

const dedupeByUuid = (identities: NodeIdentity[]): NodeIdentity[] => {
  const seen = new Set<string>()
  const unique: NodeIdentity[] = []
  identities.forEach((eachIdentity) => {
    if (seen.has(eachIdentity.uuid) === false) {
      seen.add(eachIdentity.uuid)
      unique.push(eachIdentity)
    }
  })
  return unique
}

export const mapPulledRows = (rows: PulledNode[][]): NodeIdentity[] => {
  const identities: NodeIdentity[] = []
  rows.forEach((eachRow) => {
    const firstColumn = eachRow[0]
    if (firstColumn === undefined) {
      return
    }
    const identity = pulledNodeToIdentity(firstColumn)
    if (identity !== null) {
      identities.push(identity)
    }
  })
  return dedupeByUuid(identities)
}

const extractIdentityFromValue = (value: unknown): NodeIdentity | null => {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'string') {
    if (isValidUuid(value)) {
      return {
        uuid: value,
        title: '',
        updatedAt: null,
        createdAt: null,
        isPage: false,
      }
    }
    return null
  }
  if (typeof value === 'object') {
    const pulled = value as PulledNode
    if (typeof readAttr(pulled, 'block/uuid') === 'string') {
      return pulledNodeToIdentity(pulled)
    }
  }
  return null
}

const extractIdentityFromRow = (row: unknown[]): NodeIdentity | null => {
  for (const eachColumn of row) {
    const candidate = extractIdentityFromValue(eachColumn)
    if (candidate !== null) {
      return candidate
    }
  }
  return null
}

export const normaliseResult = (rows: unknown): NodeIdentity[] => {
  if (Array.isArray(rows) === false) {
    return []
  }
  const identities: NodeIdentity[] = []
  rows.forEach((eachRow) => {
    if (Array.isArray(eachRow)) {
      const fromRow = extractIdentityFromRow(eachRow)
      if (fromRow !== null) {
        identities.push(fromRow)
      }
      return
    }
    const single = extractIdentityFromValue(eachRow)
    if (single !== null) {
      identities.push(single)
    }
  })
  return dedupeByUuid(identities)
}

const buildTagMatchClause = (tagUuids: string[]): string => {
  const validUuids: string[] = []
  tagUuids.forEach((eachUuid) => {
    if (isValidUuid(eachUuid)) {
      validUuids.push(eachUuid)
    }
  })
  if (validUuids.length === 0) {
    return '[(ground false) ?node]'
  }
  if (validUuids.length === 1) {
    const onlyUuid = validUuids[0]
    if (onlyUuid === undefined) {
      return '[(ground false) ?node]'
    }
    return `[?tag :block/uuid #uuid "${onlyUuid}"] [?node :block/tags ?tag]`
  }
  const disjuncts: string[] = []
  validUuids.forEach((eachUuid, index) => {
    const tagVariable = `?tag${index}`
    disjuncts.push(
      `(and [${tagVariable} :block/uuid #uuid "${eachUuid}"] [?node :block/tags ${tagVariable}])`,
    )
  })
  return `(or-join [?node]\n   ${disjuncts.join('\n   ')})`
}

const buildPolicyClauses = (policy: NodePolicy): string => {
  const clauses: string[] = []
  if (policy.nodes === 'pages-only') {
    clauses.push('[?node :block/name ?nodeName]')
  }
  if (policy.includeJournal === false) {
    clauses.push('(not [?node :block/journal-day ?journalDay])')
    clauses.push(
      '(not [?node :block/page ?journalParent] [?journalParent :block/journal-day ?parentJournalDay])',
    )
  }
  return clauses.join('\n ')
}

export const buildTagResolveQuery = (
  tagUuids: string[],
  policy: NodePolicy,
): string => {
  const matchClause = buildTagMatchClause(tagUuids)
  const policyClauses = buildPolicyClauses(policy)
  return `[:find ${PHASE_ONE_PULL}\n :where\n ${matchClause}\n ${policyClauses}]`
}
