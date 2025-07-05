import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-105 shadow-md hover:shadow-lg backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-accent border border-primary/20 font-semibold",
        destructive:
          "bg-red-500 text-white hover:bg-red-600 font-semibold",
        outline:
          "border border-primary/40 bg-white/90 text-primary hover:bg-primary/10 hover:text-primary font-semibold",
        secondary:
          "bg-secondary/20 text-charcoal hover:bg-secondary/30 border border-secondary/40 font-semibold",
        ghost: "text-charcoal hover:bg-primary/10 hover:text-primary font-medium",
        link: "text-primary underline-offset-4 hover:underline font-medium",
        romantic: "bg-romantic-gradient text-white hover:opacity-90 border border-primary/30 font-semibold shadow-lg",
      },
      size: {
        default: "h-11 px-6 py-3",
        sm: "h-9 rounded-xl px-4 text-sm",
        lg: "h-12 rounded-2xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants } 