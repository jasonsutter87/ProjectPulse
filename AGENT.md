# Agent Instructions

This project uses ProjectPulse for task management. When working on this codebase, you can add, update, and track tasks via the API.

## Board API

**Base URL:** `https://project-pulse-lilac.vercel.app`

**Authentication:** If `PULSE_API_KEY` env var is set, include header:
```
Authorization: Bearer $PULSE_API_KEY
```

## Endpoints

| Action | Method | Endpoint | Body |
|--------|--------|----------|------|
| List tickets | GET | `/api/tickets` | - |
| Create ticket | POST | `/api/tickets` | `{title, description?, project_id, status, priority, tag_ids?}` |
| Update ticket | PATCH | `/api/tickets/:id` | `{title?, status?, priority?, ...}` |
| Delete ticket | DELETE | `/api/tickets/:id` | - |
| List projects | GET | `/api/projects` | - |
| List tags | GET | `/api/tags` | - |

## Field Values

| Field | Values |
|-------|--------|
| `status` | `"backlog"`, `"in_progress"`, `"done"` |
| `priority` | `0` (low), `1` (medium), `2` (high), `3` (critical) |
| `tag_ids` | `1`=dev, `4`=go-live, `6`=feature |
| `project_id` | `1`=ProjectPulse (use `/api/projects` to list) |

## Examples

**Add a task:**
```bash
curl -X POST https://project-pulse-lilac.vercel.app/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"title": "Fix login bug", "project_id": 1, "status": "backlog", "priority": 2, "tag_ids": [1]}'
```

**List all tickets:**
```bash
curl -s https://project-pulse-lilac.vercel.app/api/tickets
```

**Move ticket to done:**
```bash
curl -X PATCH https://project-pulse-lilac.vercel.app/api/tickets/5 \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'
```

**With authentication (when enabled):**
```bash
curl -X GET https://project-pulse-lilac.vercel.app/api/tickets \
  -H "Authorization: Bearer $PULSE_API_KEY"
```

## When to Update the Board

- When you find TODOs or FIXMEs in code, consider adding them as tickets
- When you complete a task, mark it as done
- When you discover bugs or issues, create tickets for them
- Tag appropriately: `dev` for code tasks, `go-live` for deployment, `feature` for new features
