import { z } from 'zod'

const attributeValueSchema = z.union([z.string(), z.number(), z.boolean()])

export const spanSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().nullable(),
  service: z.string().min(1),
  operation: z.string().min(1),
  kind: z.enum(['server', 'client', 'internal', 'producer', 'consumer']),
  startMs: z.number().nonnegative(),
  durationMs: z.number().positive(),
  status: z.enum(['ok', 'error', 'unset']),
  attributes: z.record(z.string(), attributeValueSchema),
  note: z.string(),
})

export const traceSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    startedAt: z.iso.datetime(),
    durationMs: z.number().positive(),
    rootService: z.string().min(1),
    environment: z.string().min(1),
    status: z.enum(['ok', 'error']),
    attributes: z.record(z.string(), attributeValueSchema),
    spans: z.array(spanSchema).min(1),
  })
  .superRefine((trace, context) => {
    const ids = new Set(trace.spans.map((span) => span.id))
    if (ids.size !== trace.spans.length) {
      context.addIssue({
        code: 'custom',
        path: ['spans'],
        message: 'Span IDs must be unique.',
      })
    }
    trace.spans.forEach((span, index) => {
      if (span.parentId && !ids.has(span.parentId)) {
        context.addIssue({
          code: 'custom',
          path: ['spans', index, 'parentId'],
          message: `Unknown parent span: ${span.parentId}`,
        })
      }
      if (span.startMs + span.durationMs > trace.durationMs + 0.01) {
        context.addIssue({
          code: 'custom',
          path: ['spans', index, 'durationMs'],
          message: 'Span exceeds the trace duration.',
        })
      }
    })
    const byId = new Map(trace.spans.map((span) => [span.id, span]))
    const hasCycle = trace.spans.some((span) => {
      const visited = new Set<string>()
      let current: Span | undefined = span
      while (current) {
        if (visited.has(current.id)) return true
        visited.add(current.id)
        current = current.parentId ? byId.get(current.parentId) : undefined
      }
      return false
    })
    if (hasCycle) {
      context.addIssue({
        code: 'custom',
        path: ['spans'],
        message: 'Span graph must be acyclic.',
      })
    }
  })

export const traceWorkspaceSchema = z
  .object({
    project: z.string().min(1),
    traces: z.array(traceSchema).min(1),
  })
  .superRefine((workspace, context) => {
    const ids = new Set(workspace.traces.map((trace) => trace.id))
    if (ids.size !== workspace.traces.length) {
      context.addIssue({
        code: 'custom',
        path: ['traces'],
        message: 'Trace IDs must be unique.',
      })
    }
  })

export type Span = z.infer<typeof spanSchema>
export type Trace = z.infer<typeof traceSchema>
export type TraceWorkspace = z.infer<typeof traceWorkspaceSchema>

export function spanDepth(span: Span, trace: Trace) {
  const byId = new Map(trace.spans.map((item) => [item.id, item]))
  const visited = new Set<string>()
  let depth = 0
  let parentId = span.parentId
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)
    depth += 1
    parentId = byId.get(parentId)?.parentId ?? null
  }
  return depth
}

export function criticalChain(trace: Trace) {
  const byId = new Map(trace.spans.map((span) => [span.id, span]))
  const parents = new Set(
    trace.spans.map((span) => span.parentId).filter(Boolean),
  )
  const leaf = trace.spans
    .filter((span) => !parents.has(span.id))
    .sort((a, b) => b.startMs + b.durationMs - (a.startMs + a.durationMs))[0]
  const chain: Span[] = []
  const visited = new Set<string>()
  let current: Span | undefined = leaf
  while (current && !visited.has(current.id)) {
    chain.unshift(current)
    visited.add(current.id)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return chain
}

export function traceSummary(workspace: TraceWorkspace) {
  const durations = workspace.traces
    .map((trace) => trace.durationMs)
    .sort((a, b) => a - b)
  const index = Math.min(
    durations.length - 1,
    Math.ceil(durations.length * 0.95) - 1,
  )
  const errors = workspace.traces.filter(
    (trace) => trace.status === 'error',
  ).length
  const services = new Set(
    workspace.traces.flatMap((trace) =>
      trace.spans.map((span) => span.service),
    ),
  )
  return {
    traces: workspace.traces.length,
    errors,
    errorRate: Math.round((errors / workspace.traces.length) * 100),
    p95: durations[index] ?? 0,
    services: services.size,
  }
}

export function serviceMetrics(trace: Trace) {
  const groups = new Map<string, Span[]>()
  trace.spans.forEach((span) =>
    groups.set(span.service, [...(groups.get(span.service) ?? []), span]),
  )
  return [...groups.entries()]
    .map(([service, spans]) => ({
      service,
      spans: spans.length,
      durationMs: spans.reduce((total, span) => total + span.durationMs, 0),
      errors: spans.filter((span) => span.status === 'error').length,
    }))
    .sort((a, b) => b.durationMs - a.durationMs)
}

export function serviceEdges(trace: Trace) {
  const byId = new Map(trace.spans.map((span) => [span.id, span]))
  const edges = new Map<
    string,
    { source: string; target: string; calls: number; errors: number }
  >()
  trace.spans.forEach((span) => {
    const parent = span.parentId ? byId.get(span.parentId) : undefined
    if (!parent || parent.service === span.service) return
    const key = `${parent.service}->${span.service}`
    const current = edges.get(key) ?? {
      source: parent.service,
      target: span.service,
      calls: 0,
      errors: 0,
    }
    current.calls += 1
    if (span.status === 'error') current.errors += 1
    edges.set(key, current)
  })
  return [...edges.values()]
}

export function filterTraces(
  traces: Trace[],
  query: string,
  status: 'all' | Trace['status'],
  service: string,
) {
  const needle = query.trim().toLowerCase()
  return traces.filter(
    (trace) =>
      (status === 'all' || trace.status === status) &&
      (!service || trace.spans.some((span) => span.service === service)) &&
      (!needle ||
        trace.name.toLowerCase().includes(needle) ||
        trace.id.toLowerCase().includes(needle) ||
        trace.spans.some((span) =>
          `${span.service} ${span.operation}`.toLowerCase().includes(needle),
        )),
  )
}

export const serviceTone: Record<string, string> = {
  gateway: 'bg-cyan-600',
  checkout: 'bg-violet-600',
  inventory: 'bg-amber-500',
  payments: 'bg-emerald-600',
  shipping: 'bg-rose-500',
  database: 'bg-slate-600',
}
