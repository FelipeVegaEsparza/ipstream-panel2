import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-control border border-line bg-surface-2 px-3 py-2 text-[13px] text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-[13px] file:font-medium placeholder:text-[color:var(--text-3)] focus-visible:outline-none focus-visible:border-[color:var(--signal)] focus-visible:ring-1 focus-visible:ring-[color:var(--signal)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }