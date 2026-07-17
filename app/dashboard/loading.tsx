import { StatsGridSkeleton, CardSkeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <SkeletonTitle />
          <SkeletonSubtitle />
        </div>
      </div>
      <StatsGridSkeleton count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  )
}

function SkeletonTitle() {
  return <div className="h-9 w-48 bg-gray-700 rounded-lg animate-pulse" />
}

function SkeletonSubtitle() {
  return <div className="h-4 w-72 bg-gray-700 rounded-lg animate-pulse mt-2" />
}
