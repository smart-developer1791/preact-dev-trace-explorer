import { formatDistanceToNowStrict } from 'date-fns'
import { Clock3, Search, TriangleAlert } from 'lucide-preact'
import type { Trace } from '../domain/traces'

export function TraceList({
  traces,
  selectedId,
  query,
  status,
  service,
  services,
  onQuery,
  onStatus,
  onService,
  onSelect,
}: {
  traces: Trace[]
  selectedId: string
  query: string
  status: 'all' | Trace['status']
  service: string
  services: string[]
  onQuery: (value: string) => void
  onStatus: (value: 'all' | Trace['status']) => void
  onService: (value: string) => void
  onSelect: (id: string) => void
}) {
  return (
    <section class="border-y border-slate-200 bg-white sm:border">
      <div class="border-b border-slate-200 p-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="font-bold">Trace stream</h2>
            <p class="mt-1 text-xs text-slate-500">
              {traces.length} requests in view
            </p>
          </div>
          <span class="inline-flex items-center gap-1 bg-cyan-50 px-2 py-1 text-xs font-bold text-cyan-800">
            Live sample
          </span>
        </div>
        <label class="relative mt-4 block">
          <span class="sr-only">Search traces</span>
          <Search
            class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            class="h-10 w-full border border-slate-300 bg-slate-50 pr-3 pl-9 text-sm"
            value={query}
            onInput={(event) => onQuery(event.currentTarget.value)}
            placeholder="Route, trace ID, or operation"
          />
        </label>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <label>
            <span class="sr-only">Trace status</span>
            <select
              class="h-10 w-full border border-slate-300 bg-white px-2 text-sm"
              value={status}
              onChange={(event) =>
                onStatus(event.currentTarget.value as 'all' | Trace['status'])
              }
            >
              <option value="all">All statuses</option>
              <option value="error">Errors</option>
              <option value="ok">Successful</option>
            </select>
          </label>
          <label>
            <span class="sr-only">Service filter</span>
            <select
              class="h-10 w-full border border-slate-300 bg-white px-2 text-sm"
              value={service}
              onChange={(event) => onService(event.currentTarget.value)}
            >
              <option value="">All services</option>
              {services.map((name) => (
                <option value={name} key={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div class="divide-y divide-slate-100">
        {traces.map((trace) => (
          <button
            class={`w-full border-l-4 p-4 text-left hover:bg-slate-50 ${selectedId === trace.id ? 'border-cyan-600 bg-cyan-50/60' : 'border-transparent'}`}
            type="button"
            onClick={() => onSelect(trace.id)}
            aria-pressed={selectedId === trace.id}
            key={trace.id}
          >
            <span class="flex items-start gap-3">
              <span
                class={`mt-1 size-2.5 shrink-0 ${trace.status === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}
              />
              <span class="min-w-0 flex-1">
                <strong class="block truncate text-sm">{trace.name}</strong>
                <span class="mt-1 block truncate font-mono text-xs text-slate-400">
                  {trace.id}
                </span>
                <span class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span class="inline-flex items-center gap-1">
                    <Clock3 size={13} /> {trace.durationMs} ms
                  </span>
                  <span>{trace.spans.length} spans</span>
                  <span>{trace.environment}</span>
                </span>
                <span class="mt-2 block text-xs text-slate-400">
                  {formatDistanceToNowStrict(new Date(trace.startedAt), {
                    addSuffix: true,
                  })}
                </span>
              </span>
              {trace.status === 'error' && (
                <TriangleAlert
                  class="shrink-0 text-red-500"
                  size={16}
                  aria-label="Error trace"
                />
              )}
            </span>
          </button>
        ))}
        {!traces.length && (
          <div class="p-8 text-center">
            <Search class="mx-auto text-slate-300" size={28} />
            <p class="mt-3 text-sm font-bold">No traces match this view</p>
            <p class="mt-1 text-xs text-slate-500">
              Adjust the search or filters.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
