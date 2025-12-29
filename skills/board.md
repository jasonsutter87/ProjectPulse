# /board

Manage your ProjectPulse scrum board from Claude Code.

## Usage

```
/board <command> [options]
```

## Commands

### List tickets
```
/board list [--project <name>] [--tag <tag>] [--status <status>]
```

### Add a ticket
```
/board add "<title>" [--project <name>] [--tags <tag1,tag2>] [--priority <0-3>] [--status <status>]
```

### Move a ticket
```
/board move <id> --to <status>
```
Status: backlog, in_progress, review, done

### Complete a ticket
```
/board done <id>
```

### Scan a project
```
/board scan <path> [--import]
```

### Show board status
```
/board status
```

---

## Instructions

When the user invokes `/board`, parse their command and interact with the ProjectPulse API running at `http://localhost:3000`.

### API Endpoints

- `GET /api/tickets` - List tickets (supports `?project_id=X&tag_id=X&status=X`)
- `POST /api/tickets` - Create ticket `{title, description, project_id, status, priority, tag_ids}`
- `PATCH /api/tickets/:id` - Update ticket
- `DELETE /api/tickets/:id` - Delete ticket
- `GET /api/projects` - List projects
- `GET /api/tags` - List tags
- `POST /api/scan` - Scan project `{path, max_depth}`
- `POST /api/scan/import` - Scan and import `{path, max_depth, include_subprojects}`

### Command Handling

**For `/board list`:**
1. Fetch tickets from `/api/tickets` with appropriate filters
2. Format as a table showing: ID, Title, Status, Tags, Project
3. Group by status column if no status filter

**For `/board add "<title>"`:**
1. Parse title from quotes
2. Look up project ID by name if `--project` provided
3. Look up tag IDs by name if `--tags` provided
4. POST to `/api/tickets`
5. Return confirmation with ticket ID

**For `/board move <id> --to <status>`:**
1. PATCH `/api/tickets/:id` with `{status}`
2. Return confirmation

**For `/board done <id>`:**
1. PATCH `/api/tickets/:id` with `{status: "done"}`
2. Return confirmation with celebration

**For `/board scan <path>`:**
1. POST to `/api/scan` with `{path}`
2. Display tech stack, missing items, suggested todos
3. If `--import` flag, POST to `/api/scan/import` to create project and tickets

**For intelligent roadmap scanning (natural language):**
When user says "Scan [path] and add tasks from the roadmap":
1. Read ROADMAP.md, TODO.md, README.md, and other planning files
2. Check the actual codebase to see what's already implemented
3. Only create tickets for items that are NOT yet complete
4. Skip items where the code/feature already exists
5. Tag appropriately based on task type (dev, marketing, go-live, etc.)

**For `/board status`:**
1. Fetch all tickets
2. Show count per column: Backlog (X) | In Progress (X) | Review (X) | Done (X)
3. Show recent activity if any

### Example Responses

**List:**
```
📋 Tickets (5 total)

Backlog (2):
  #12 Set up CI/CD pipeline [dev, go-live]
  #15 Write unit tests [dev]

In Progress (2):
  #8 Build user dashboard [dev, feature] - MyApp
  #11 Fix login bug [bug]

Done (1):
  #3 Initial project setup [dev] ✓
```

**Add:**
```
✅ Created ticket #16: "Add dark mode toggle"
   Status: backlog | Tags: dev, feature | Project: VeilKey
```

**Move:**
```
➡️ Moved #8 "Build user dashboard" to In Progress
```

**Done:**
```
🎉 Completed #11 "Fix login bug"!
```

**Scan:**
```
🔍 Scanned: /Users/jasonsutter/Documents/Companies/VeilKey

Tech Stack: Node.js, React, Next.js
Missing: Tests, CI/CD, SEO Meta Tags, Sitemap

Suggested Todos (4):
  • Add test coverage [dev] - Priority: High
  • Set up CI/CD pipeline [dev, go-live] - Priority: Medium
  • Optimize SEO meta tags [seo, marketing] - Priority: Medium
  • Generate sitemap.xml [seo] - Priority: Low

Use '/board scan <path> --import' to create project and tickets.
```

### Error Handling

- If API is not reachable, remind user to start ProjectPulse: `npm run dev`
- If project/tag not found, list available options
- If ticket ID not found, show error with suggestion to list tickets

### Configuration

**API URL Priority:**
1. If `PULSE_API_URL` env var is set, use that
2. If in a project directory with ProjectPulse, check if localhost:3000 is running
3. Otherwise, use the production URL: `https://YOUR-NETLIFY-SITE.netlify.app`

Before making API calls, check if the API is reachable. For production, the user should set:
```bash
export PULSE_API_URL="https://your-projectpulse.netlify.app"
```

Or add to their shell profile (~/.zshrc or ~/.bashrc).
