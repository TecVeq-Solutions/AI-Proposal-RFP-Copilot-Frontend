import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create account — RFP Copilot",
  description: "Start your free RFP Copilot trial.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
