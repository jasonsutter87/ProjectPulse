# ProjectPulse

A scrum board web app with an AI agent for managing multiple projects across your filesystem.

## Overview

ProjectPulse is a centralized kanban board that:
- Tracks todos across multiple projects in configurable directories
- Categorizes tasks by status (columns) and type (tags)
- Provides a REST API for programmatic access
- Includes a Claude Code agent/skill for natural language board updates
- Audits projects to auto-generate initial todos

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      ProjectPulse                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Web UI    │  │  REST API   │  │  Claude Code Agent  │  │
│  │  (Next.js)  │  │  (Routes)   │  │     (/board)        │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          │                                   │
│                   ┌──────▼──────┐                            │
│                   │   SQLite    │                            │
│                   │  Database   │                            │
│                   └─────────────┘                            │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Project Scanner/Auditor                 │    │
│  │  - Detects tech stack (package.json, pubspec, etc)  │    │
│  │  - Suggests todos based on missing files/configs    │    │
│  │  - Configurable folder selection                    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Next.js 14 (App Router) | Modern React, built-in API routes |
| Styling | Tailwind CSS | Rapid UI development |
| Database | SQLite (better-sqlite3) | Portable, single file, no server needed |
| Drag & Drop | @dnd-kit | Accessible, performant kanban interactions |
| Agent | Claude Code Skill | Natural language board updates |

---

## Data Model

### Projects
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tickets
```sql
CREATE TABLE tickets (
  id INTEGER PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'backlog', -- backlog, in_progress, review, done
  priority INTEGER DEFAULT 0,    -- 0=low, 1=medium, 2=high, 3=urgent
  position INTEGER DEFAULT 0,    -- for ordering within column
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tags
```sql
CREATE TABLE tags (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6b7280'
);

-- Default tags: dev, marketing, seo, go-live
```

### Ticket Tags (many-to-many)
```sql
CREATE TABLE ticket_tags (
  ticket_id INTEGER REFERENCES tickets(id),
  tag_id INTEGER REFERENCES tags(id),
  PRIMARY KEY (ticket_id, tag_id)
);
```

---

## Board Columns

| Column | Status Value | Description |
|--------|--------------|-------------|
| Backlog | `backlog` | Not started, planned work |
| In Progress | `in_progress` | Currently being worked on |
| Review | `review` | Needs review/testing |
| Done | `done` | Completed |

---

## Default Tags

| Tag | Color | Use Case |
|-----|-------|----------|
| Dev | `#3b82f6` (blue) | Development tasks |
| Marketing | `#8b5cf6` (purple) | Marketing tasks |
| SEO | `#10b981` (green) | SEO optimization |
| Go-Live | `#f59e0b` (amber) | Launch/deployment tasks |
| Bug | `#ef4444` (red) | Bug fixes |
| Feature | `#06b6d4` (cyan) | New features |

---

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Add a project
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Remove project

### Tickets
- `GET /api/tickets` - List tickets (supports filters)
- `POST /api/tickets` - Create ticket
- `PATCH /api/tickets/:id` - Update ticket (status, position, etc.)
- `DELETE /api/tickets/:id` - Delete ticket

### Tags
- `GET /api/tags` - List all tags
- `POST /api/tags` - Create tag
- `DELETE /api/tags/:id` - Delete tag

### Scanner
- `POST /api/scan` - Scan a directory and return suggested todos
- `GET /api/scan/techs` - List detected tech stacks for a path

---

## Claude Code Agent

### Skill: `/board`

A Claude Code skill that provides natural language board management:

```bash
# Add a ticket
/board add "Implement OAuth" --project VeilKey --tags dev,feature

# Move a ticket
/board move 42 --to in_progress

# Complete a ticket
/board done 42

# List tickets
/board list --project VeilSuite --tag marketing --status backlog

# Scan and add project
/board scan /path/to/project

# Quick status
/board status
```

### Implementation
- Located in `~/.claude/skills/board.md`
- Calls ProjectPulse API endpoints
- Returns formatted responses

---

## Project Scanner

The scanner analyzes project directories to:

1. **Detect Tech Stack**
   - `package.json` → Node.js/JavaScript
   - `pubspec.yaml` → Flutter/Dart
   - `Cargo.toml` → Rust
   - `requirements.txt` / `pyproject.toml` → Python
   - `go.mod` → Go

2. **Check Completeness**
   - README.md exists?
   - Tests exist?
   - CI/CD configured?
   - Environment example?
   - License?

3. **Generate Todos**
   - Missing README → "Write README documentation" (tag: dev)
   - No tests → "Add test coverage" (tag: dev)
   - No CI → "Set up CI/CD pipeline" (tag: dev, go-live)
   - No SEO meta → "Add SEO meta tags" (tag: seo, marketing)

---

## Phases & Tasks

### Phase 1: Foundation (Core Infrastructure)
- [x] Create project folder and plan
- [ ] Initialize Next.js project with TypeScript
- [ ] Set up Tailwind CSS
- [ ] Create SQLite database schema
- [ ] Implement database connection layer
- [ ] Create seed data (default tags)

### Phase 2: API Layer
- [ ] Implement projects CRUD endpoints
- [ ] Implement tickets CRUD endpoints
- [ ] Implement tags CRUD endpoints
- [ ] Add filtering/sorting for tickets
- [ ] Add batch operations (move multiple, bulk update)

### Phase 3: Web UI
- [ ] Create layout and navigation
- [ ] Build kanban board component
- [ ] Implement drag-and-drop between columns
- [ ] Add ticket card component
- [ ] Add ticket detail modal/drawer
- [ ] Build project selector/filter
- [ ] Build tag filter
- [ ] Add create ticket form
- [ ] Add project management page

### Phase 4: Project Scanner
- [ ] Build tech stack detector
- [ ] Build completeness checker
- [ ] Create todo generator rules
- [ ] Add scan API endpoint
- [ ] Add "Scan Project" UI flow
- [ ] Implement batch scan for multiple projects

### Phase 5: Claude Code Agent
- [ ] Create `/board` skill file
- [ ] Implement add command
- [ ] Implement move command
- [ ] Implement done command
- [ ] Implement list command
- [ ] Implement scan command
- [ ] Implement status command
- [ ] Add to user's Claude Code skills

### Phase 6: Polish & Launch
- [ ] Add keyboard shortcuts
- [ ] Add search functionality
- [ ] Responsive design (mobile)
- [ ] Dark mode support
- [ ] Export/import data
- [ ] Documentation
- [ ] Go-live checklist

---

## File Structure

```
ProjectPulse/
├── PLAN.md                 # This file
├── README.md               # User documentation
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── .env.example
├── .gitignore
│
├── prisma/                 # Or raw SQL migrations
│   └── schema.prisma
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx        # Main board view
│   │   ├── projects/
│   │   │   └── page.tsx    # Project management
│   │   └── api/
│   │       ├── projects/
│   │       ├── tickets/
│   │       ├── tags/
│   │       └── scan/
│   │
│   ├── components/
│   │   ├── Board/
│   │   │   ├── Board.tsx
│   │   │   ├── Column.tsx
│   │   │   └── TicketCard.tsx
│   │   ├── TicketModal.tsx
│   │   ├── ProjectSelector.tsx
│   │   ├── TagFilter.tsx
│   │   └── CreateTicketForm.tsx
│   │
│   ├── lib/
│   │   ├── db.ts           # Database connection
│   │   ├── scanner.ts      # Project scanner
│   │   └── utils.ts
│   │
│   └── types/
│       └── index.ts
│
├── skills/
│   └── board.md            # Claude Code skill definition
│
└── data/
    └── pulse.db            # SQLite database
```

---

## Getting Started (Post-Build)

```bash
# Install dependencies
npm install

# Initialize database
npm run db:init

# Start development server
npm run dev

# Open http://localhost:3000
```

---

## Configuration

The app uses environment variables for configuration:

```env
# Database path (default: ./data/pulse.db)
DATABASE_PATH=./data/pulse.db

# Server port (default: 3000)
PORT=3000

# Base URL for API (used by agent)
API_BASE_URL=http://localhost:3000
```

---

## Future Ideas

- [ ] Multi-user support with auth
- [ ] Time tracking per ticket
- [ ] Sprint planning mode
- [ ] GitHub/GitLab integration
- [ ] Slack notifications
- [ ] Calendar view for deadlines
- [ ] Analytics dashboard
- [ ] Mobile app (React Native)
