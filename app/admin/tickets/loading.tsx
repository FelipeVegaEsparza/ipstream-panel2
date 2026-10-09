import { TableSkeleton } from '@/components/ui/skeleton'

export default function TicketsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-56 bg-secondary rounded-lg animate-pulse" />
      <TableSkeleton rows={6} />
    </div>
  )
}
