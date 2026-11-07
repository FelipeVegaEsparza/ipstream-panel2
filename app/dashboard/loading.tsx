export default function DashboardLoading() {
  return (
    <div className="space-y-7">
      <div className="border-b border-line pb-5">
        <div className="h-6 w-48 animate-pulse rounded bg-surface-3" />
        <div className="mt-2 h-3 w-64 animate-pulse rounded bg-surface-3" />
      </div>

      <div className="dashboard-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <div className="h-3 w-20 animate-pulse rounded bg-surface-3" />
          <div className="h-3 w-14 animate-pulse rounded bg-surface-3" />
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          {[0, 1].map((index) => (
            <div key={index} className="space-y-3">
              <div className="h-3 w-24 animate-pulse rounded bg-surface-3" />
              <div className="h-4 w-40 animate-pulse rounded bg-surface-3" />
              <div className="h-10 w-full animate-pulse rounded bg-surface-3" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="dashboard-panel overflow-hidden">
          <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="bg-card p-4">
                <div className="h-3 w-20 animate-pulse rounded bg-surface-3" />
                <div className="mt-3 h-7 w-16 animate-pulse rounded bg-surface-3" />
                <div className="mt-2 h-3 w-24 animate-pulse rounded bg-surface-3" />
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 py-3">
            <div className="h-3 w-full max-w-md animate-pulse rounded bg-surface-3" />
          </div>
        </div>

        <div className="dashboard-panel overflow-hidden">
          <div className="border-b border-line px-4 py-2.5">
            <div className="h-3 w-16 animate-pulse rounded bg-surface-3" />
          </div>
          <div className="divide-y divide-line">
            {[0, 1].map((index) => (
              <div key={index} className="space-y-2 px-4 py-3">
                <div className="h-3 w-28 animate-pulse rounded bg-surface-3" />
                <div className="h-3 w-40 animate-pulse rounded bg-surface-3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
