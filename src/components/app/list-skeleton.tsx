export function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy>
      {[0, 1, 2].map((row) => (
        <div key={row} className="h-16 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
