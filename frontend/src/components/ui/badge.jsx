import { cn } from "@/lib/utils";

export function Badge({ className, variant = "default", ...props }) {
  const variants = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    destructive: "bg-destructive text-destructive-foreground",
    outline: "border border-input text-foreground",
    success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
