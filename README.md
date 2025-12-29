# ProjectPulse

A scrum board web app with an AI agent for managing multiple projects.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/YOUR_USERNAME/ProjectPulse)

## Features

- **Kanban Board** - Drag-and-drop tickets between Backlog, In Progress, Review, and Done
- **Multi-Project Support** - Manage todos across multiple projects with configurable directories
- **Category Tags** - Label tickets with Dev, Marketing, SEO, Go-Live, Bug, Feature (and custom tags)
- **Project Scanner** - Auto-detect tech stack and generate todos for missing items
- **Claude Code Agent** - Natural language board updates via `/board` skill
- **SQLite Database** - Portable, no server needed, single file

## Quick Start

```bash
# Install dependencies
npm install

# Initialize database
npm run db:init
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Self-Hosting

ProjectPulse can be self-hosted with optional multi-user authentication.

### Option 1: Single-User Mode (No Auth)

Perfect for personal use or internal teams.

1. **Deploy to Netlify** using the button above (or your preferred host)
2. Set environment variables:
   ```
   DISABLE_AUTH=true
   NEXT_PUBLIC_DISABLE_AUTH=true
   ```
3. That's it! All data is stored in your own Netlify Blobs.

### Option 2: Multi-User Mode (With Clerk Auth)

Enable authentication so multiple users can have their own isolated data.

1. **Create a Clerk account** at [clerk.com](https://clerk.com)
2. Create a new application in the Clerk dashboard
3. **Deploy to Netlify** and set environment variables:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_SECRET_KEY=sk_live_...
   DISABLE_AUTH=false
   NEXT_PUBLIC_DISABLE_AUTH=false
   ```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | For auth | Clerk publishable key |
| `CLERK_SECRET_KEY` | For auth | Clerk secret key |
| `DISABLE_AUTH` | No | Set to `true` for single-user mode |
| `NEXT_PUBLIC_DISABLE_AUTH` | No | Client-side auth flag (match DISABLE_AUTH) |
| `DATABASE_PATH` | No | Custom SQLite path (local dev only) |

### Local Development

```bash
# Copy environment template
cp .env.example .env.local

# For single-user mode, set:
# DISABLE_AUTH=true
# NEXT_PUBLIC_DISABLE_AUTH=true

# For multi-user mode, add your Clerk keys

npm install
npm run dev
```

## Claude Code Agent

Install the `/board` skill for Claude Code:

```bash
npm run install:skill
```

Then use natural language commands:

```bash
# List tickets
/board list
/board list --tag dev
/board list --project VeilKey

# Add tickets
/board add "Fix login bug" --tags dev,bug --priority 2
/board add "Write docs" --project MyApp --tags dev

# Move tickets
/board move 42 --to in_progress
/board move 42 --to review

# Complete tickets
/board done 42

# Scan projects
/board scan /path/to/project
/board scan /path/to/project --import

# Status overview
/board status
```

## Project Scanner

The scanner analyzes your project directories to:

1. **Detect Tech Stack** - Node.js, React, Next.js, Flutter, Rust, Python, Go, Docker, and more
2. **Check Completeness** - README, license, tests, CI/CD, environment files
3. **Generate Todos** - Suggested tasks based on what's missing
4. **Find Subprojects** - Recursively scan nested projects

### Web-Specific Checks

For web projects, it also checks:
- SEO meta tags
- Favicon and app icons
- Sitemap.xml
- Robots.txt

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Tickets
- `GET /api/tickets` - List tickets (with filters)
- `POST /api/tickets` - Create ticket
- `PATCH /api/tickets/:id` - Update ticket
- `DELETE /api/tickets/:id` - Delete ticket
- `POST /api/tickets/reorder` - Reorder ticket (drag & drop)

### Tags
- `GET /api/tags` - List tags
- `POST /api/tags` - Create tag
- `DELETE /api/tags/:id` - Delete tag

### Scanner
- `POST /api/scan` - Scan a directory
- `POST /api/scan/import` - Scan and import with todos

## Database

SQLite database stored at `data/pulse.db`. The schema includes:

- **projects** - Project name, path, description
- **tickets** - Title, description, status, priority, position
- **tags** - Name and color
- **ticket_tags** - Many-to-many relationship

## Development

```bash
# Run dev server
npm run dev

# Run linter
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## Documentation

See [PLAN.md](./PLAN.md) for full architecture and roadmap.
