import {
  DATE_GROUP_LABEL_LAST_SEVEN_DAYS,
  DATE_GROUP_LABEL_LAST_THIRTY_DAYS,
  DATE_GROUP_LABEL_OLDER,
  DATE_GROUP_LABEL_TODAY,
  DATE_GROUP_LABEL_UNKNOWN,
  DATE_GROUP_LABEL_YESTERDAY,
  ONE_DAY_MS,
  SORT_CREATED,
  SORT_TITLE,
} from '../constants'
import type { DateGroup, NodeIdentity, Sort } from '../types'

const getSortTimestamp = (node: NodeIdentity, sort: Sort): number | null => {
  if (sort === SORT_CREATED) {
    return node.createdAt
  }
  return node.updatedAt
}

export const sortNodes = (
  nodes: NodeIdentity[],
  sort: Sort,
): NodeIdentity[] => {
  const copy = nodes.slice()
  if (sort === SORT_TITLE) {
    copy.sort((left, right) => {
      return left.title.localeCompare(right.title)
    })
    return copy
  }
  copy.sort((left, right) => {
    const leftRaw = getSortTimestamp(left, sort)
    const rightRaw = getSortTimestamp(right, sort)
    const leftValue = leftRaw === null ? 0 : leftRaw
    const rightValue = rightRaw === null ? 0 : rightRaw
    return rightValue - leftValue
  })
  return copy
}

export const filterNodes = (
  nodes: NodeIdentity[],
  filter: string,
): NodeIdentity[] => {
  const trimmed = filter.trim().toLowerCase()
  if (trimmed.length === 0) {
    return nodes
  }
  const result: NodeIdentity[] = []
  nodes.forEach((eachNode) => {
    if (eachNode.title.toLowerCase().includes(trimmed)) {
      result.push(eachNode)
    }
  })
  return result
}

const startOfDay = (timestamp: number): number => {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

const classify = (
  timestamp: number | null,
  todayStart: number,
  yesterdayStart: number,
  sevenDaysStart: number,
  thirtyDaysStart: number,
): string => {
  if (timestamp === null) {
    return DATE_GROUP_LABEL_UNKNOWN
  }
  if (timestamp >= todayStart) {
    return DATE_GROUP_LABEL_TODAY
  }
  if (timestamp >= yesterdayStart) {
    return DATE_GROUP_LABEL_YESTERDAY
  }
  if (timestamp >= sevenDaysStart) {
    return DATE_GROUP_LABEL_LAST_SEVEN_DAYS
  }
  if (timestamp >= thirtyDaysStart) {
    return DATE_GROUP_LABEL_LAST_THIRTY_DAYS
  }
  return DATE_GROUP_LABEL_OLDER
}

const groupByDate = (
  nodes: NodeIdentity[],
  sort: Sort,
  now: number,
): DateGroup[] => {
  const todayStart = startOfDay(now)
  const yesterdayStart = todayStart - ONE_DAY_MS
  const sevenDaysStart = todayStart - 7 * ONE_DAY_MS
  const thirtyDaysStart = todayStart - 30 * ONE_DAY_MS

  const orderedLabels = [
    DATE_GROUP_LABEL_TODAY,
    DATE_GROUP_LABEL_YESTERDAY,
    DATE_GROUP_LABEL_LAST_SEVEN_DAYS,
    DATE_GROUP_LABEL_LAST_THIRTY_DAYS,
    DATE_GROUP_LABEL_OLDER,
    DATE_GROUP_LABEL_UNKNOWN,
  ]
  const buckets = new Map<string, NodeIdentity[]>()
  orderedLabels.forEach((eachLabel) => {
    buckets.set(eachLabel, [])
  })

  nodes.forEach((eachNode) => {
    const timestamp = getSortTimestamp(eachNode, sort)
    const label = classify(
      timestamp,
      todayStart,
      yesterdayStart,
      sevenDaysStart,
      thirtyDaysStart,
    )
    const bucket = buckets.get(label)
    if (bucket !== undefined) {
      bucket.push(eachNode)
    }
  })

  const groups: DateGroup[] = []
  orderedLabels.forEach((eachLabel) => {
    const bucket = buckets.get(eachLabel)
    if (bucket !== undefined && bucket.length > 0) {
      groups.push({ label: eachLabel, nodes: bucket })
    }
  })
  return groups
}

const computeInitial = (title: string): string => {
  const trimmed = title.trim()
  if (trimmed.length === 0) {
    return '#'
  }
  const firstChar = trimmed.charAt(0).toUpperCase()
  if (firstChar >= 'A' && firstChar <= 'Z') {
    return firstChar
  }
  return '#'
}

const groupByInitial = (nodes: NodeIdentity[]): DateGroup[] => {
  const buckets = new Map<string, NodeIdentity[]>()
  nodes.forEach((eachNode) => {
    const initial = computeInitial(eachNode.title)
    const existing = buckets.get(initial)
    if (existing === undefined) {
      buckets.set(initial, [eachNode])
    } else {
      existing.push(eachNode)
    }
  })
  const labels = Array.from(buckets.keys())
  labels.sort((left, right) => {
    return left.localeCompare(right)
  })
  const groups: DateGroup[] = []
  labels.forEach((eachLabel) => {
    const nodesForLabel = buckets.get(eachLabel)
    if (nodesForLabel !== undefined) {
      groups.push({ label: eachLabel, nodes: nodesForLabel })
    }
  })
  return groups
}

export const groupNodes = (
  nodes: NodeIdentity[],
  sort: Sort,
  now: number,
): DateGroup[] => {
  if (sort === SORT_TITLE) {
    return groupByInitial(nodes)
  }
  return groupByDate(nodes, sort, now)
}
