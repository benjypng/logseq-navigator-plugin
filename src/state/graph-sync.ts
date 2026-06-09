import { onGraphChanged } from '../logseq/api'
import { reloadForGraphChange } from './actions'

export const startGraphSync = (): (() => void) => {
  const off = onGraphChanged(() => {
    void reloadForGraphChange()
  })
  return off
}
