import type { MDXComponents } from "mdx/types";

// Required by @next/mdx (App Router). Styling comes from Tailwind Typography via the `prose` wrapper in app/docs/layout.tsx.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...components };
}
