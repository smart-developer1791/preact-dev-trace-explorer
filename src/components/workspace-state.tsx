import { LoaderCircle, RotateCcw, TriangleAlert } from 'lucide-preact'

export function WorkspaceState({
  error,
  onRetry,
}: {
  error: string
  onRetry?: () => void
}) {
  return (
    <main class="grid min-h-screen place-items-center bg-slate-100 p-5 text-slate-900">
      <section class="w-full max-w-md border border-slate-200 bg-white p-6 text-center shadow-sm">
        {error ? (
          <>
            <TriangleAlert class="mx-auto text-red-600" size={28} />
            <h1 class="mt-4 text-xl font-bold">
              Trace workspace could not load
            </h1>
            <p class="mt-2 text-sm leading-6 text-slate-500" role="alert">
              {error}
            </p>
            {onRetry && (
              <button
                class="mt-5 inline-flex h-10 items-center gap-2 bg-cyan-700 px-4 text-sm font-bold text-white hover:bg-cyan-800"
                type="button"
                onClick={onRetry}
              >
                <RotateCcw size={16} /> Try again
              </button>
            )}
          </>
        ) : (
          <>
            <LoaderCircle
              class="mx-auto animate-spin text-cyan-700"
              size={28}
            />
            <h1 class="mt-4 text-lg font-bold">Loading trace workspace</h1>
          </>
        )}
      </section>
    </main>
  )
}
