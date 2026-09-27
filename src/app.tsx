import {
  Activity,
  Download,
  GitBranch,
  ListFilter,
  PanelRight,
  RefreshCw,
  Upload,
} from 'lucide-preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { ZodError } from 'zod'
import { ServiceMap } from './components/service-map'
import { SpanInspector } from './components/span-inspector'
import { TraceList } from './components/trace-list'
import { TraceWaterfall } from './components/trace-waterfall'
import { WorkspaceState } from './components/workspace-state'
import {
  filterTraces,
  traceSummary,
  traceWorkspaceSchema,
  type TraceWorkspace,
} from './domain/traces'
import {
  loadWorkspace,
  resetWorkspace,
  saveWorkspace,
} from './services/trace-store'

const storageKey = 'dev-trace-explorer-v1'
const sampleUrl = '/sample-traces.json'

function downloadJson(workspace: TraceWorkspace) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(workspace, null, 2)], {
      type: 'application/json',
    }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = 'trace-workspace.json'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function readableError(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    const issue = error.issues[0]
    return `${fallback} at ${issue.path.join('.') || 'workspace'}: ${issue.message}`
  }
  return error instanceof Error ? error.message : fallback
}

export function App() {
  const noticeTimer = useRef<number | undefined>(undefined)
  const [workspace, setWorkspace] = useState<TraceWorkspace | null>(null)
  const [selectedTraceId, setSelectedTraceId] = useState('')
  const [selectedSpanId, setSelectedSpanId] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'ok' | 'error'>('all')
  const [service, setService] = useState('')
  const [detailMode, setDetailMode] = useState<'waterfall' | 'map'>('waterfall')
  const [mobileView, setMobileView] = useState<
    'traces' | 'detail' | 'map' | 'span'
  >('traces')
  const [notice, setNotice] = useState<{
    text: string
    error?: boolean
  } | null>(null)
  const [loadError, setLoadError] = useState('')

  function applyWorkspace(data: TraceWorkspace) {
    setWorkspace(data)
    setSelectedTraceId(data.traces[0].id)
    setSelectedSpanId(data.traces[0].spans[0].id)
  }

  function load() {
    setLoadError('')
    void loadWorkspace(storageKey, sampleUrl)
      .then(applyWorkspace)
      .catch((error: unknown) =>
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Unexpected trace workspace error.',
        ),
      )
  }

  useEffect(load, [])
  useEffect(() => () => window.clearTimeout(noticeTimer.current), [])

  function notify(text: string, error = false) {
    window.clearTimeout(noticeTimer.current)
    setNotice({ text, error })
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2400)
  }

  async function persist(next: TraceWorkspace, message = '') {
    try {
      const parsed = traceWorkspaceSchema.parse(next)
      setWorkspace(parsed)
      await saveWorkspace(storageKey, parsed)
      if (message) notify(message)
      return true
    } catch (error) {
      notify(readableError(error, 'Trace workspace is invalid'), true)
      return false
    }
  }

  async function importWorkspace(file: File) {
    try {
      const parsed = traceWorkspaceSchema.parse(JSON.parse(await file.text()))
      await saveWorkspace(storageKey, parsed)
      applyWorkspace(parsed)
      setMobileView('traces')
      notify(`${file.name} imported with ${parsed.traces.length} traces.`)
    } catch (error) {
      notify(readableError(error, 'Trace workspace is invalid'), true)
    }
  }

  if (!workspace) return <WorkspaceState error={loadError} onRetry={load} />

  const selectedTrace =
    workspace.traces.find((trace) => trace.id === selectedTraceId) ??
    workspace.traces[0]
  const selectedSpan =
    selectedTrace.spans.find((span) => span.id === selectedSpanId) ??
    selectedTrace.spans[0]
  const services = [
    ...new Set(
      workspace.traces.flatMap((trace) =>
        trace.spans.map((span) => span.service),
      ),
    ),
  ].sort()
  const visibleTraces = filterTraces(workspace.traces, query, status, service)
  const summary = traceSummary(workspace)

  function selectTrace(id: string) {
    const trace = workspace?.traces.find((item) => item.id === id)
    if (!trace) return
    setSelectedTraceId(id)
    setSelectedSpanId(trace.spans[0].id)
    setDetailMode('waterfall')
    setMobileView('detail')
  }

  function updateNote(note: string) {
    const next = {
      ...workspace!,
      traces: workspace!.traces.map((trace) =>
        trace.id === selectedTrace.id
          ? {
              ...trace,
              spans: trace.spans.map((span) =>
                span.id === selectedSpan.id ? { ...span, note } : span,
              ),
            }
          : trace,
      ),
    }
    void persist(next)
  }

  const mobileTabs = [
    ['traces', ListFilter, 'Traces'],
    ['detail', Activity, 'Waterfall'],
    ['map', GitBranch, 'Map'],
    ['span', PanelRight, 'Span'],
  ] as const

  return (
    <main class="min-h-screen bg-slate-100 text-slate-900">
      <header class="border-b border-slate-800 bg-[#10242b] text-white">
        <div class="mx-auto flex min-h-16 max-w-[1800px] items-center gap-3 px-4 sm:px-6">
          <span class="grid size-10 shrink-0 place-items-center bg-cyan-300 text-[#10242b]">
            <Activity size={21} />
          </span>
          <div class="min-w-0">
            <strong class="block truncate text-sm">Trace Atlas</strong>
            <span class="block truncate text-xs text-cyan-100/70">
              Distributed request explorer
            </span>
          </div>
          <span class="ml-auto hidden text-xs text-slate-300 md:block">
            Local workspace · OpenTelemetry-shaped data
          </span>
          <button
            class="grid size-10 place-items-center border border-white/15 hover:bg-white/5 max-sm:ml-auto"
            type="button"
            onClick={() =>
              void resetWorkspace(storageKey, sampleUrl)
                .then((data) => {
                  applyWorkspace(data)
                  setQuery('')
                  setStatus('all')
                  setService('')
                  setMobileView('traces')
                  notify('Sample traces restored.')
                })
                .catch((error: unknown) =>
                  notify(
                    error instanceof Error
                      ? error.message
                      : 'Could not restore samples.',
                    true,
                  ),
                )
            }
            aria-label="Restore sample traces"
            title="Restore sample traces"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </header>

      <section class="border-b border-slate-200 bg-white">
        <div class="mx-auto max-w-[1800px] px-4 py-5 sm:px-6">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p class="text-xs font-bold text-cyan-700">
                OBSERVABILITY WORKSPACE
              </p>
              <h1 class="mt-1 text-2xl font-bold sm:text-3xl">
                Follow latency across every service
              </h1>
              <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Inspect request waterfalls, isolate the critical chain, and
                preserve investigation context without sending telemetry outside
                the browser.
              </p>
            </div>
            <div class="flex gap-2">
              <label class="inline-flex h-10 cursor-pointer items-center gap-2 border border-slate-300 px-3 text-sm font-bold hover:bg-slate-50">
                <Upload size={16} /> Import
                <input
                  class="sr-only"
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0]
                    if (file) void importWorkspace(file)
                    event.currentTarget.value = ''
                  }}
                />
              </label>
              <button
                class="inline-flex h-10 items-center gap-2 border border-slate-300 px-3 text-sm font-bold hover:bg-slate-50"
                type="button"
                onClick={() => {
                  downloadJson(workspace)
                  notify('Trace workspace exported.')
                }}
              >
                <Download size={16} /> Export
              </button>
            </div>
          </div>
          <div class="mt-5 grid grid-cols-2 border border-slate-200 bg-slate-50 lg:grid-cols-4">
            {[
              [summary.traces, 'Traces'],
              [`${summary.errorRate}%`, 'Error rate'],
              [`${summary.p95} ms`, 'P95 latency'],
              [summary.services, 'Services'],
            ].map(([value, label]) => (
              <div
                class="border-r border-slate-200 p-3 last:border-r-0 sm:p-4"
                key={label}
              >
                <strong class="block text-xl">{value}</strong>
                <span class="mt-1 block text-xs text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <nav
        class="grid grid-cols-4 border-b border-slate-200 bg-white lg:hidden"
        aria-label="Trace views"
      >
        {mobileTabs.map(([value, Icon, label]) => (
          <button
            class={`inline-flex min-h-12 items-center justify-center gap-1 border-b-2 px-1 text-xs font-bold ${mobileView === value ? 'border-cyan-700 text-cyan-800' : 'border-transparent text-slate-500'}`}
            type="button"
            onClick={() => {
              setMobileView(value)
              if (value === 'detail') setDetailMode('waterfall')
              if (value === 'map') setDetailMode('map')
            }}
            aria-pressed={mobileView === value}
            key={value}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </nav>

      <div class="mx-auto grid max-w-[1800px] grid-cols-1 items-start gap-4 p-0 sm:p-5 lg:grid-cols-[310px_minmax(0,1fr)_320px]">
        <div class={mobileView === 'traces' ? 'block' : 'hidden lg:block'}>
          <TraceList
            traces={visibleTraces}
            selectedId={selectedTrace.id}
            query={query}
            status={status}
            service={service}
            services={services}
            onQuery={setQuery}
            onStatus={setStatus}
            onService={setService}
            onSelect={selectTrace}
          />
        </div>

        <div
          class={`min-w-0 ${mobileView === 'detail' || mobileView === 'map' ? 'block' : 'hidden lg:block'}`}
        >
          <div class="mb-3 hidden border border-slate-200 bg-white p-1 lg:flex">
            {(
              [
                ['waterfall', Activity, 'Waterfall'],
                ['map', GitBranch, 'Service map'],
              ] as const
            ).map(([value, Icon, label]) => (
              <button
                class={`inline-flex h-9 items-center gap-2 px-3 text-sm font-bold ${detailMode === value ? 'bg-cyan-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                type="button"
                onClick={() => setDetailMode(value)}
                aria-pressed={detailMode === value}
                key={value}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
          {detailMode === 'map' ? (
            <ServiceMap
              trace={selectedTrace}
              onFilter={(name) => {
                setService(name)
                setMobileView('traces')
                notify(`Filtering traces by ${name}.`)
              }}
            />
          ) : (
            <TraceWaterfall
              trace={selectedTrace}
              selectedSpanId={selectedSpan.id}
              onSelect={(id) => {
                setSelectedSpanId(id)
                setMobileView('span')
              }}
            />
          )}
        </div>

        <div class={mobileView === 'span' ? 'block' : 'hidden lg:block'}>
          <SpanInspector
            trace={selectedTrace}
            span={selectedSpan}
            onNote={updateNote}
          />
        </div>
      </div>

      {notice && (
        <div
          class={`fixed right-4 bottom-4 z-50 max-w-[calc(100vw-2rem)] border px-4 py-3 text-sm font-bold shadow-lg ${notice.error ? 'border-red-300 bg-red-50 text-red-800' : 'border-cyan-300 bg-cyan-50 text-cyan-900'}`}
          role="alert"
        >
          {notice.text}
        </div>
      )}
    </main>
  )
}
