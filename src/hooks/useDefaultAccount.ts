import { useState } from 'react'

const KEY_PAY     = (wsId: string) => `finanzas:defAcct:pay:${wsId}`
const KEY_COLLECT = (wsId: string) => `finanzas:defAcct:collect:${wsId}`

export function useDefaultAccount(workspaceId: string) {
  const [tick, setTick] = useState(0)

  const defaultPayAccountId     = localStorage.getItem(KEY_PAY(workspaceId))     ?? ''
  const defaultCollectAccountId = localStorage.getItem(KEY_COLLECT(workspaceId)) ?? ''

  function setDefaultPayAccount(accountId: string) {
    localStorage.setItem(KEY_PAY(workspaceId), accountId)
    setTick(t => t + 1)
  }

  function setDefaultCollectAccount(accountId: string) {
    localStorage.setItem(KEY_COLLECT(workspaceId), accountId)
    setTick(t => t + 1)
  }

  void tick

  return { defaultPayAccountId, defaultCollectAccountId, setDefaultPayAccount, setDefaultCollectAccount }
}
