import { DocumentRowSkeleton } from "@/components/skeletons";

export default function DocumentsLoading() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      {[0, 1, 2, 3, 4].map((i) => (
        <DocumentRowSkeleton key={i} />
      ))}
    </div>
  );
}
