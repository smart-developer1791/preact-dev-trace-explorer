import { AlertCircle, CheckCircle2 } from 'lucide-preact'
import {
  criticalChain,
  serviceTone,
  spanDepth,
  type Trace,
} from '../domain/traces'

export function TraceWaterfall({
  trace,
  selectedSpanId,
  onSelect,
}: {
  trace: Trace
  selectedSpanId: string
  onSelect: (id: string) => void
}) {
  const critical = new Set(criticalChain(trace).map((span) => span.id))
  const ticks = [0, 25, 50, 75, 100]

  return (
    <section class="min-w-0 border-y border-slate-200 bg-white sm:border">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div>
          <p class="text-xs font-bold text-cyan-700">SELECTED TRACE</p>
          <h2 class="mt-1 font-bold">{trace.name}</h2>
          <p class="mt-1 font-mono text-xs text-slate-400">{trace.id}</p>
        </div>
        <div class="text-right">
          <strong class="block text-xl">{trace.durationMs} ms</strong>
          <span class="text-xs text-slate-500">{trace.spans.length} spans</span>
        </div>
      </header>

      <div class="overflow-x-auto">
        <div class="min-w-[720px] p-4">
          <div class="grid grid-cols-[220px_minmax(440px,1fr)] items-end gap-3 border-b border-slate-200 pb-2">
            <span class="text-xs font-bold text-slate-500">Operation</span>
            <div class="flex justify-between text-xs text-slate-400">
              {ticks.map((tick) => (
                <span key={tick}>
                  {Math.round((trace.durationMs * tick) / 100)} ms
                </span>
              ))}
            </div>
          </div>
          <div class="divide-y divide-slate-100">
            {[...trace.spans]
              .sort(
                (a, b) => a.startMs - b.startMs || b.durationMs - a.durationMs,
              )
              .map((span) => {
                const left = (span.startMs / trace.durationMs) * 100
                const width = Math.max(
                  (span.durationMs / trace.durationMs) * 100,
                  1.5,
                )
                return (
                  <button
                    class={`grid w-full grid-cols-[220px_minmax(440px,1fr)] items-center gap-3 py-2 text-left ${selectedSpanId === span.id ? 'bg-cyan-50/70' : 'hover:bg-slate-50'}`}
                    type="button"
                    onClick={() => onSelect(span.id)}
                    aria-pressed={selectedSpanId === span.id}
                    key={span.id}
                  >
                    <span
                      class="flex min-w-0 items-center"
                      style={{ paddingLeft: spanDepth(span, trace) * 12 }}
                    >
                      {span.status === 'error' ? (
                        <AlertCircle
                          class="mr-2 shrink-0 text-red-500"
                          size={14}
                        />
                      ) : (
                        <CheckCircle2
                          class="mr-2 shrink-0 text-emerald-500"
                          size={14}
                        />
                      )}
                      <span class="min-w-0">
                        <strong class="block truncate text-xs">
                          {span.operation}
                        </strong>
                        <span class="mt-0.5 block truncate text-xs text-slate-400">
                          {span.service} · {span.durationMs} ms
                        </span>
                      </span>
                    </span>
                    <span class="relative h-8 bg-slate-50">
                      {ticks.slice(1, -1).map((tick) => (
                        <span
                          class="absolute inset-y-0 border-l border-dashed border-slate-200"
                          style={{ left: `${tick}%` }}
                          aria-hidden="true"
                          key={tick}
                        />
                      ))}
                      <span
                        class={`absolute top-1 h-6 min-w-1 ${span.status === 'error' ? 'bg-red-500' : (serviceTone[span.service] ?? 'bg-cyan-600')} ${critical.has(span.id) ? 'ring-2 ring-amber-300 ring-offset-1' : ''}`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                      />
                    </span>
                  </button>
                )
              })}
          </div>
        </div>
      </div>
      <footer class="flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
        <span class="inline-flex items-center gap-1.5">
          <span class="size-2.5 bg-amber-300" /> Critical chain
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="size-2.5 bg-red-500" /> Error
        </span>
        <span class="ml-auto">Click a span to inspect it</span>
      </footer>
    </section>
  )
}
