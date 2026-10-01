import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join the beta — RFP Copilot",
  description: "Request access to the RFP Copilot private beta.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
