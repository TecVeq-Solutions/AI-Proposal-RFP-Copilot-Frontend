import { ProposalCardSkeleton } from "@/components/skeletons";

export default function ProposalsLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <ProposalCardSkeleton key={i} />
      ))}
    </div>
  );
}
