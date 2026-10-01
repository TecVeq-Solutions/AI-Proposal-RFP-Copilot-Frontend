import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proposals — RFP Copilot",
  description: "Create, edit and share AI-assisted proposals.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
