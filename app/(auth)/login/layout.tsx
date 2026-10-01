import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — RFP Copilot",
  description: "Sign in to RFP Copilot.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
