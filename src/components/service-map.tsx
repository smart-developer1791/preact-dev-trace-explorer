import dagre from '@dagrejs/dagre'
import { useMemo } from 'preact/hooks'
import { serviceEdges, serviceMetrics, type Trace } from '../domain/traces'

export function ServiceMap({
  trace,
  onFilter,
}: {
  trace: Trace
  onFilter: (name: string) => void
}) {
  const metrics = serviceMetrics(trace)
  const edges = serviceEdges(trace)
  const layout = useMemo(() => {
    const graph = new dagre.graphlib.Graph()
      .setGraph({
        rankdir: 'LR',
        ranksep: 82,
        nodesep: 34,
        marginx: 30,
        marginy: 28,
      })
      .setDefaultEdgeLabel(() => ({}))
    metrics.forEach((service) =>
      graph.setNode(service.service, { width: 170, height: 78 }),
    )
    edges.forEach((edge) => graph.setEdge(edge.source, edge.target, edge))
    dagre.layout(graph)
    const dimensions = graph.graph()
    return {
      graph,
      width: Math.max(dimensions.width ?? 760, 760),
      height: Math.max(dimensions.height ?? 260, 260),
    }
  }, [trace.id])

  return (
    <section class="border-y border-slate-200 bg-white sm:border">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div>
          <h2 class="font-bold">Service dependency map</h2>
          <p class="mt-1 text-xs text-slate-500">
            Derived from parent-child span relationships
          </p>
        </div>
        <span class="text-xs font-bold text-cyan-700">
          {metrics.length} services
        </span>
      </header>
      <div class="overflow-x-auto bg-slate-50">
        <div
          class="relative"
          style={{ width: layout.width, height: layout.height }}
        >
          <svg
            class="absolute inset-0"
            width={layout.width}
            height={layout.height}
            aria-hidden="true"
          >
            <defs>
              <marker
                id="service-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
              </marker>
            </defs>
            {layout.graph.edges().map((edge) => {
              const data = layout.graph.edge(edge)
              return (
                <g key={`${edge.v}-${edge.w}`}>
                  <path
                    d={data.points
                      .map(
                        (point: { x: number; y: number }, index: number) =>
                          `${index ? 'L' : 'M'} ${point.x} ${point.y}`,
                      )
                      .join(' ')}
                    fill="none"
                    stroke={data.errors ? '#ef4444' : '#94a3b8'}
                    stroke-width={data.errors ? 2.5 : 1.5}
                    marker-end="url(#service-arrow)"
                  />
                </g>
              )
            })}
          </svg>
          {metrics.map((service) => {
            const position = layout.graph.node(service.service)
            return (
              <button
                class={`absolute h-[78px] w-[170px] border bg-white p-3 text-left shadow-sm hover:border-cyan-600 ${service.errors ? 'border-red-300' : 'border-slate-300'}`}
                style={{ left: position.x - 85, top: position.y - 39 }}
                type="button"
                onClick={() => onFilter(service.service)}
                key={service.service}
              >
                <strong class="block truncate text-sm">
                  {service.service}
                </strong>
                <span class="mt-2 flex justify-between text-xs text-slate-500">
                  <span>{service.spans} spans</span>
                  <span>{service.durationMs} ms</span>
                </span>
                <span
                  class={`mt-2 block h-1 ${service.errors ? 'bg-red-500' : 'bg-cyan-600'}`}
                />
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
