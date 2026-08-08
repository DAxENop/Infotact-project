import { cn } from "@/lib/utils";

export function Table({ className, ...props }) {
  return <div className="relative w-full overflow-auto"><table className={cn("w-full caption-bottom text-sm", className)} {...props} /></div>;
}

export function TableHeader({ className, ...props }) {
  return <thead className={cn("[&_tr]:border-b", className)} {...props} />;
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return <tr className={cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)} {...props} />;
}

export function TableHead({ className, ...props }) {
  return <th className={cn("h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", className)} {...props} />;
}

export function TableCell({ className, ...props }) {
  return <td className={cn("p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", className)} {...props} />;
}
