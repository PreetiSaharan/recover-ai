import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function ListCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-3.5 py-3.5">
            <Skeleton className="h-10 w-1 shrink-0 self-stretch rounded" />
            <Skeleton className="size-5 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="space-y-1.5 text-right">
              <Skeleton className="ml-auto h-3.5 w-12" />
              <Skeleton className="ml-auto h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
            <Skeleton className="h-8 w-20 shrink-0 rounded-lg" />
          </CardContent>
        </Card>
      ))}
    </>
  )
}
