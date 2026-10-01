import type { useRouter } from "next/navigation";

/** Fired when "New Proposal" is requested while the proposals page is already mounted. */
export const NEW_PROPOSAL_EVENT = "rfp:new-proposal";

/** Opens the "New Proposal" modal: in place on the proposals page, otherwise via ?new=1. */
export function requestNewProposal(pathname: string, router: ReturnType<typeof useRouter>) {
  if (pathname === "/dashboard/proposals") {
    window.dispatchEvent(new Event(NEW_PROPOSAL_EVENT));
  } else {
    router.push("/dashboard/proposals?new=1");
  }
}
