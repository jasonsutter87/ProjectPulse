# ProjectPulse Roadmap

## Phase 1: Phases & Sprints Feature

Add hierarchical project management: Projects > Phases > Sprints > Tasks

### Database & Types
- [x] Add Phase type definitions to `src/types/index.ts`
- [x] Add Sprint type definitions to `src/types/index.ts`
- [x] Add AgentRun and QualityGate types to `src/types/index.ts`
- [x] Create phases table in `src/lib/db.ts`
- [x] Create sprints table in `src/lib/db.ts`
- [x] Create sprint_agent_runs table in `src/lib/db.ts`
- [x] Create sprint_quality_gates table in `src/lib/db.ts`
- [x] Add phase_id and sprint_id columns to tickets table
- [x] Extend Storage interface with phase methods
- [x] Extend Storage interface with sprint methods
- [x] Implement phase methods in SQLite storage
- [x] Implement sprint methods in SQLite storage
- [x] Implement phase methods in Netlify Blob storage
- [x] Implement sprint methods in Netlify Blob storage
- [x] Implement phase methods in Vercel Blob storage
- [x] Implement sprint methods in Vercel Blob storage

### API Routes
- [x] Create GET /api/phases endpoint
- [x] Create POST /api/phases endpoint
- [x] Create PATCH /api/phases/[id] endpoint
- [x] Create DELETE /api/phases/[id] endpoint
- [x] Create GET /api/sprints endpoint
- [x] Create POST /api/sprints endpoint
- [x] Create PATCH /api/sprints/[id] endpoint
- [x] Create DELETE /api/sprints/[id] endpoint
- [x] Create POST /api/sprints/[id]/configure endpoint
- [x] Create POST /api/sprints/[id]/start endpoint
- [x] Create GET /api/sprints/[id]/status endpoint
- [x] Update /api/tickets to support phase_id filter
- [x] Update /api/tickets to support sprint_id filter

### UI Components - Phase/Sprint Selection
- [x] Create PhaseSelector component
- [x] Create PhaseModal component for create/edit
- [x] Create SprintSelector component
- [x] Create SprintModal component for create/edit
- [x] Update Board.tsx to filter by phase/sprint (includes phase/sprint selectors in toolbar)
- [x] Update TicketModal to include phase/sprint fields

### UI Components - Orchestrator Dashboard
- [x] Create SprintConfigModal for repo/branch config
- [x] Create SprintProgressView for real-time status
- [x] Create SprintAgentStatus for agent pipeline visualization
- [x] Create SprintQualityGates for quality gate checklist
- [x] Add "Plan Sprint" button to board header

### Sprint Orchestrator Agent
- [ ] Create sprint-orchestrator.md agent definition
- [ ] Implement orchestrator initialization stage
- [ ] Implement Tech Lead evaluation stage
- [ ] Implement parallel development coordination
- [ ] Implement merge and review stage
- [ ] Implement performance audit stage
- [ ] Implement documentation update stage
- [ ] Implement code cleanup stage
- [ ] Implement Red Team security passes
- [ ] Implement Black Team penetration testing
- [ ] Implement final merge decision logic

---

## Phase 2: API Security (Pending)
- [ ] Add API_SECRET_KEY environment variable
- [ ] Create API key validation helper
- [ ] Update getUserId to support API key auth
- [ ] Add Clerk env vars to Netlify
- [ ] Add Clerk env vars to Vercel
- [ ] Remove DISABLE_AUTH=true from deployments
- [ ] Test authenticated API access
