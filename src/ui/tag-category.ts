export type TagCategory = 'read' | 'think' | 'do' | 'money' | 'meta'

const CATEGORY_BY_TAG: Record<string, TagCategory> = {
  concept: 'think',
  contradiction: 'think',
  entity: 'think',
  question: 'think',
  seedling: 'think',
  synthesis: 'think',
  uncertain: 'think',

  current: 'do',
  errand: 'do',
  event: 'do',
  project: 'do',
  todoisttask: 'do',
  trip: 'do',

  blogseq: 'read',
  gospelreflection: 'read',
  readwise: 'read',
  resource: 'read',
  source: 'read',
  zotero: 'read',

  expense: 'money',

  area: 'meta',
  lint: 'meta',
  location: 'meta',
  nodebuddy: 'meta',
  orphan: 'meta',
}

export const getTagCategory = (name: string): TagCategory => {
  const key = name.trim().toLowerCase()
  return CATEGORY_BY_TAG[key] ?? 'meta'
}

export const getCategoryColorVar = (category: TagCategory): string => {
  return 'var(--nav-' + category + ')'
}
