# ProjectPulse Roadmap

## Phase 1: Phases & Sprints Feature

Add hierarchical project management: Projects > Phases > Sprints > Tasks

### Database & Types
- [ ] Add Phase type definitions to `src/types/index.ts`
- [ ] Add Sprint type definitions to `src/types/index.ts`
- [ ] Add AgentRun and QualityGate types to `src/types/index.ts`
- [ ] Create phases table in `src/lib/db.ts`
- [ ] Create sprints table in `src/lib/db.ts`
- [ ] Create sprint_agent_runs table in `src/lib/db.ts`
- [ ] Create sprint_quality_gates table in `src/lib/db.ts`
- [ ] Add phase_id and sprint_id columns to tickets table
- [ ] Extend Storage interface with phase methods
- [ ] Extend Storage interface with sprint methods
- [ ] Implement phase methods in SQLite storage
- [ ] Implement sprint methods in SQLite storage
- [ ] Implement phase methods in Netlify Blob storage
- [ ] Implement sprint methods in Netlify Blob storage
- [ ] Implement phase methods in Vercel Blob storage
- [ ] Implement sprint methods in Vercel Blob storage

### API Routes
- [ ] Create GET /api/phases endpoint
- [ ] Create POST /api/phases endpoint
- [ ] Create PATCH /api/phases/[id] endpoint
- [ ] Create DELETE /api/phases/[id] endpoint
- [ ] Create GET /api/sprints endpoint
- [ ] Create POST /api/sprints endpoint
- [ ] Create PATCH /api/sprints/[id] endpoint
- [ ] Create DELETE /api/sprints/[id] endpoint
- [ ] Create POST /api/sprints/[id]/configure endpoint
- [ ] Create POST /api/sprints/[id]/start endpoint
- [ ] Create GET /api/sprints/[id]/status endpoint
- [ ] Update /api/tickets to support phase_id filter
- [ ] Update /api/tickets to support sprint_id filter

### UI Components - Phase/Sprint Selection
- [ ] Create PhaseSelector component
- [ ] Create PhaseModal component for create/edit
- [ ] Create SprintSelector component
- [ ] Create SprintModal component for create/edit
- [ ] Create BoardHeader component with phase/sprint tabs
- [ ] Update Board.tsx to filter by phase/sprint
- [ ] Update TicketModal to include phase/sprint fields

### UI Components - Orchestrator Dashboard
- [ ] Create SprintConfigModal for repo/branch config
- [ ] Create SprintProgressView for real-time status
- [ ] Create SprintAgentStatus for agent pipeline visualization
- [ ] Create SprintQualityGates for quality gate checklist
- [ ] Add "Plan Next Sprint" button to board header

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
