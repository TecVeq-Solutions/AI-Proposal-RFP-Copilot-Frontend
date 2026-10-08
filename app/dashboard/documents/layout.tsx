import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documents — RFP Copilot",
  description: "Upload and search your RFPs and reference documents.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
