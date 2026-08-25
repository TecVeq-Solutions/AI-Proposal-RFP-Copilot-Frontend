# AI Proposal & RFP Copilot — Frontend

Next.js web application for **AI Proposal & RFP Copilot** (Tecveq).

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (TypeScript, App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Data | TanStack Query + Axios |
| Editor | Tiptap (proposals) |
| Auth | JWT against Backend API |

## Repository layout

```text
/
├── app/              # Next.js App Router (Day 3+)
├── components/       # UI components (Day 3+)
├── lib/              # API client, helpers (later)
├── .gitignore
└── README.md
```

Backend & AI service live in: [AI-Proposal-RFP-Copilot-Backend](https://github.com/TecVeq-Solutions/AI-Proposal-RFP-Copilot-Backend).

## Branches

| Branch | Purpose |
|--------|---------|
| `dev` | Local development & daily task pushes |
| `staging` | Testing & stable pre-production |
| `main` | Production |

## Getting started (after Day 3)

```bash
npm install
npm run dev
```

App will run at [http://localhost:3000](http://localhost:3000). Point API calls at the Backend (`http://localhost:5000` by default after Day 2).
