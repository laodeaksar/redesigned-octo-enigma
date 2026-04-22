import { cva, type VariantProps } from "class-variance-authority";

const loadingIndicatorVariants = cva(
  "inline-flex items-center justify-center animate-spin rounded-full border-2 border-transparent",
  {
    variants: {
      size: {
        xs: "h-3 w-3 border-[1.5px]",
        sm: "h-4 w-4 border-[1.5px]",
        md: "h-5 w-5 border-2",
        lg: "h-6 w-6 border-2",
        xl: "h-8 w-8 border-[3px]"
      },
      variant: {
        default: "border-t-accent",
        white: "border-t-white",
        gray: "border-t-gray-500",
        accent: "border-t-accent"
      }
    },
    defaultVariants: {
      size: "md",
      variant: "default"
    }
  }
);

export interface LoadingIndicatorProps 
  extends VariantProps<typeof loadingIndicatorVariants> {
  className?: string;
}

export function LoadingIndicator({ size, variant, className }: LoadingIndicatorProps) {
  return (
    <div className={loadingIndicatorVariants({ size, variant, className })} />
  );
}

/**
 * Loading overlay untuk button dan aksi yang sedang berjalan
 */
export function ActionLoadingOverlay({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className={`transition-opacity duration-150 ${active ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
        {children}
      </div>
      
      {active && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingIndicator size="sm" variant="default" />
        </div>
      )}
    </div>
  );
}
