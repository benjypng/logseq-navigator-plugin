import type { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin.user'

import { DEFAULT_CONFIG_PAGE_NAME, DEFAULT_DEBOUNCE_MS } from './constants'

export const settings: SettingSchemaDesc[] = [
  {
    key: 'openByDefault',
    type: 'boolean',
    default: true,
    title: 'Open by default',
    description: 'Open the navigator automatically when Logseq starts.',
  },
  {
    key: 'configPageName',
    type: 'string',
    default: DEFAULT_CONFIG_PAGE_NAME,
    title: 'Config page name',
    description:
      'The page that stores folder definitions as a JSON code block.',
  },
  {
    key: 'debounceMs',
    type: 'number',
    default: DEFAULT_DEBOUNCE_MS,
    title: 'Refresh debounce (ms)',
    description:
      'How long to wait after a database change before refreshing the active folder.',
  },
]
