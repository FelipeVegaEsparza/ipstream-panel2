import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-control border border-line bg-surface-2 px-3 py-2 text-[13px] text-foreground ring-offset-background placeholder:text-[color:var(--text-3)] focus-visible:outline-none focus-visible:border-[color:var(--signal)] focus-visible:ring-1 focus-visible:ring-[color:var(--signal)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }