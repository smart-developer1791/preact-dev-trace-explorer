import { Braces, Check, Clipboard, Route, StickyNote } from 'lucide-preact'
import { useState } from 'preact/hooks'
import { criticalChain, type Span, type Trace } from '../domain/traces'

export function SpanInspector({
  trace,
  span,
  onNote,
}: {
  trace: Trace
  span: Span
  onNote: (note: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const chain = criticalChain(trace)
  const inCriticalChain = chain.some((item) => item.id === span.id)

  async function copyId() {
    try {
      await navigator.clipboard.writeText(span.id)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <aside class="border-y border-slate-200 bg-white sm:border">
      <header class="border-b border-slate-200 p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-bold text-cyan-700">SPAN INSPECTOR</p>
            <h2 class="mt-1 truncate font-bold">{span.operation}</h2>
          </div>
          <button
            class="grid size-9 shrink-0 place-items-center border border-slate-300 hover:bg-slate-50"
            type="button"
            onClick={() => void copyId()}
            aria-label="Copy span ID"
            title="Copy span ID"
          >
            {copied ? <Check size={15} /> : <Clipboard size={15} />}
          </button>
        </div>
        <p class="mt-2 break-all font-mono text-xs text-slate-400">{span.id}</p>
      </header>

      <div class="grid grid-cols-2 border-b border-slate-200">
        {[
          ['Service', span.service],
          ['Duration', `${span.durationMs} ms`],
          ['Offset', `${span.startMs} ms`],
          ['Kind', span.kind],
        ].map(([label, value]) => (
          <div
            class="border-r border-b border-slate-100 p-3 last:border-r-0"
            key={label}
          >
            <span class="block text-xs text-slate-400">{label}</span>
            <strong class="mt-1 block truncate text-sm capitalize">
              {value}
            </strong>
          </div>
        ))}
      </div>

      {inCriticalChain && (
        <div class="m-4 flex gap-3 border border-amber-200 bg-amber-50 p-3 text-amber-900">
          <Route class="mt-0.5 shrink-0" size={17} />
          <div>
            <strong class="text-sm">Critical chain</strong>
            <p class="mt-1 text-xs leading-5">
              This span contributes to the request's longest completion route.
            </p>
          </div>
        </div>
      )}

      <section class="border-t border-slate-200 p-4">
        <h3 class="flex items-center gap-2 text-sm font-bold">
          <Braces size={16} /> Attributes
        </h3>
        <dl class="mt-3 space-y-2">
          {Object.entries(span.attributes).map(([key, value]) => (
            <div class="border border-slate-200 bg-slate-50 p-2" key={key}>
              <dt class="break-all font-mono text-xs text-slate-500">{key}</dt>
              <dd class="mt-1 break-all font-mono text-xs font-bold text-slate-800">
                {String(value)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <label class="block border-t border-slate-200 p-4">
        <span class="flex items-center gap-2 text-sm font-bold">
          <StickyNote size={16} /> Investigation note
        </span>
        <textarea
          class="mt-3 min-h-24 w-full resize-y border border-slate-300 p-3 text-sm leading-6"
          value={span.note}
          onInput={(event) => onNote(event.currentTarget.value)}
          placeholder="Record a finding or owner"
        />
      </label>
    </aside>
  )
}
