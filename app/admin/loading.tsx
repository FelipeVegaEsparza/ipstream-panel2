import { StatsGridSkeleton, TableSkeleton } from '@/components/ui/skeleton'

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-56 bg-gray-700 rounded-lg animate-pulse" />
      <StatsGridSkeleton count={4} />
      <div className="h-6 w-40 bg-gray-700 rounded-lg animate-pulse mt-8" />
      <TableSkeleton rows={4} />
    </div>
  )
}
