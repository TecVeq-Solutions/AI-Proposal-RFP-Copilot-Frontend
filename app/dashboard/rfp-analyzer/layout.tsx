import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RFP Analyzer — RFP Copilot",
  description: "Extract requirements and build compliance matrices from RFPs.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
