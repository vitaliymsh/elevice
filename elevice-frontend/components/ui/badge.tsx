import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center border px-3 py-1 text-sm font-bold uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-[#75A8BA] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#75A8BA] text-white hover:bg-[#4A6D7C]",
        secondary:
          "border-transparent bg-[#F0F1F1] text-[#4A6D7C] hover:bg-[#75A8BA] hover:text-white",
        destructive:
          "border-transparent bg-[#E53E3E] text-white hover:bg-[#C53030]",
        outline: "border border-[#75A8BA] text-[#4A6D7C] bg-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
