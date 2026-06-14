import { type ReactElement, useEffect, useRef, useState } from 'react'

import { SORT_CREATED, SORT_TITLE, SORT_UPDATED } from '../constants'
import { setSort } from '../state/store'
import type { Sort } from '../types'

interface SortOption {
  value: Sort
  label: string
}

const OPTIONS: SortOption[] = [
  { value: SORT_UPDATED, label: 'Updated' },
  { value: SORT_CREATED, label: 'Created' },
  { value: SORT_TITLE, label: 'Title' },
]

const labelFor = (sort: Sort): string => {
  for (const eachOption of OPTIONS) {
    if (eachOption.value === sort) {
      return eachOption.label
    }
  }
  return 'Updated'
}

const SortIcon = (): ReactElement => {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="8 6 8 18" />
      <polyline points="5 9 8 6 11 9" />
      <polyline points="16 6 16 18" />
      <polyline points="13 15 16 18 19 15" />
    </svg>
  )
}

const CaretIcon = (): ReactElement => {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

const CheckIcon = (): ReactElement => {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

interface SortMenuProps {
  sort: Sort
}

export const SortMenu = (props: SortMenuProps): ReactElement => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (open === false) {
      return
    }
    const handlePointerDown = (event: PointerEvent): void => {
      const root = rootRef.current
      if (root !== null && root.contains(event.target as Node) === false) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleToggle = (): void => {
    setOpen((previous) => {
      return previous === false
    })
  }
  const handleSelect = (value: Sort): void => {
    setSort(value)
    setOpen(false)
  }

  return (
    <div className="navigator-sort" ref={rootRef}>
      <button
        type="button"
        className="navigator-sort-control"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="navigator-sort-icon">
          <SortIcon />
        </span>
        <span className="navigator-sort-value">{labelFor(props.sort)}</span>
        <span className="navigator-sort-caret">
          <CaretIcon />
        </span>
      </button>
      {open ? (
        <ul className="navigator-sort-menu" role="listbox">
          {OPTIONS.map((eachOption) => {
            const isActive = eachOption.value === props.sort
            const className = isActive
              ? 'navigator-sort-option navigator-sort-option-active'
              : 'navigator-sort-option'
            return (
              <li key={eachOption.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={className}
                  onClick={() => {
                    handleSelect(eachOption.value)
                  }}
                >
                  <span className="navigator-sort-option-label">
                    {eachOption.label}
                  </span>
                  {isActive ? (
                    <span className="navigator-sort-check">
                      <CheckIcon />
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
