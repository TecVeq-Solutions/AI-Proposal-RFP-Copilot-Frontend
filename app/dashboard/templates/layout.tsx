import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Templates — RFP Copilot",
  description: "Proposal templates for your organization.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
