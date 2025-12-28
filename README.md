# ProjectPulse

A scrum board web app with an AI agent for managing multiple projects.

## Features

- Kanban board with drag-and-drop
- Multi-project support with configurable directories
- Category tags (Dev, Marketing, SEO, Go-Live)
- Project scanner/auditor for auto-generating todos
- Claude Code agent for natural language board updates
- SQLite database (portable, no server needed)

## Quick Start

```bash
npm install
npm run db:init
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Claude Code Agent

```bash
/board add "Fix login bug" --project MyApp --tags dev,bug
/board move 42 --to in_progress
/board done 42
/board list --tag marketing
```

## Documentation

See [PLAN.md](./PLAN.md) for full architecture and roadmap.
