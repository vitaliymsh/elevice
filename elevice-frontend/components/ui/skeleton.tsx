import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-[#75A8BA] animate-pulse rounded-xl shadow-sm", className)}
      {...props}
    />
  )
}

export { Skeleton }
