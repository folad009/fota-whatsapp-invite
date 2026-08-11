import { cn } from "@/lib/cn";

const variants: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  sent: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  read: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  registered: "bg-emerald-100 text-emerald-800",
  declined: "bg-gray-100 text-gray-800",
  confirmed: "bg-green-100 text-green-800",
  checked_in: "bg-green-100 text-green-800",
  unknown: "bg-slate-100 text-slate-700",
  draft: "bg-slate-100 text-slate-700",
  published: "bg-blue-100 text-blue-800",
  completed: "bg-gray-100 text-gray-600",
};

export function Badge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        variants[status] ?? "bg-gray-100 text-gray-800",
        className
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
