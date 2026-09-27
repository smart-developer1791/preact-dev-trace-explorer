import { del, get, set } from 'idb-keyval'
import { traceWorkspaceSchema, type TraceWorkspace } from '../domain/traces'

async function fetchSample(sampleUrl: string) {
  const response = await fetch(sampleUrl)
  if (!response.ok)
    throw new Error('Could not load the sample trace workspace.')
  return traceWorkspaceSchema.parse(await response.json())
}

export async function loadWorkspace(storageKey: string, sampleUrl: string) {
  const saved = await get<unknown>(storageKey)
  if (saved !== undefined) {
    const result = traceWorkspaceSchema.safeParse(saved)
    if (result.success) return result.data
    await del(storageKey)
  }
  return fetchSample(sampleUrl)
}

export async function saveWorkspace(
  storageKey: string,
  workspace: TraceWorkspace,
) {
  const parsed = traceWorkspaceSchema.parse(workspace)
  await set(storageKey, parsed)
}

export async function resetWorkspace(storageKey: string, sampleUrl: string) {
  await del(storageKey)
  return fetchSample(sampleUrl)
}
