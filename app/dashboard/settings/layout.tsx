import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings — RFP Copilot",
  description: "Manage your profile, organization and team.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
