import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'pulse.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function runMigrations(db: Database.Database) {
  // Ticket migrations
  const ticketColumns = db.prepare("PRAGMA table_info(tickets)").all() as { name: string }[];

  // Add due_date column if it doesn't exist
  const hasDueDate = ticketColumns.some((col) => col.name === 'due_date');
  if (!hasDueDate) {
    db.exec('ALTER TABLE tickets ADD COLUMN due_date TEXT');
  }

  // Add start_date column if it doesn't exist
  const hasStartDate = ticketColumns.some((col) => col.name === 'start_date');
  if (!hasStartDate) {
    db.exec('ALTER TABLE tickets ADD COLUMN start_date TEXT');
  }

  // Add phase_id and sprint_id to tickets
  const hasPhaseId = ticketColumns.some((col) => col.name === 'phase_id');
  if (!hasPhaseId) {
    db.exec('ALTER TABLE tickets ADD COLUMN phase_id INTEGER REFERENCES phases(id) ON DELETE SET NULL');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tickets_phase ON tickets(phase_id)');
  }

  const hasSprintId = ticketColumns.some((col) => col.name === 'sprint_id');
  if (!hasSprintId) {
    db.exec('ALTER TABLE tickets ADD COLUMN sprint_id INTEGER REFERENCES sprints(id) ON DELETE SET NULL');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tickets_sprint ON tickets(sprint_id)');
  }

  // Project migrations
  const projectColumns = db.prepare("PRAGMA table_info(projects)").all() as { name: string }[];

  // Add user_id column for multi-tenant support
  const hasUserId = projectColumns.some((col) => col.name === 'user_id');
  if (!hasUserId) {
    db.exec('ALTER TABLE projects ADD COLUMN user_id TEXT');
    db.exec('CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)');
  }

  // Tag migrations - add user_id for per-user tags
  const tagColumns = db.prepare("PRAGMA table_info(tags)").all() as { name: string }[];
  const tagHasUserId = tagColumns.some((col) => col.name === 'user_id');
  if (!tagHasUserId) {
    db.exec('ALTER TABLE tags ADD COLUMN user_id TEXT');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id)');
  }
}

export function initializeSchema() {
  const db = getDb();

  db.exec(`
    -- Projects table
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, path)
    );

    -- Tags table
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6b7280',
      UNIQUE(user_id, name)
    );

    -- Tickets table
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'backlog' CHECK(status IN ('backlog', 'in_progress', 'review', 'done')),
      priority INTEGER DEFAULT 0 CHECK(priority IN (0, 1, 2, 3)),
      position INTEGER DEFAULT 0,
      start_date TEXT,
      due_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Ticket tags junction table
    CREATE TABLE IF NOT EXISTS ticket_tags (
      ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
      tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (ticket_id, tag_id)
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_tickets_project ON tickets(project_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_ticket_tags_ticket ON ticket_tags(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_ticket_tags_tag ON ticket_tags(tag_id);

    -- Phases table
    CREATE TABLE IF NOT EXISTS phases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      position INTEGER DEFAULT 0,
      status TEXT DEFAULT 'planning' CHECK(status IN ('planning', 'active', 'completed', 'archived')),
      start_date TEXT,
      end_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Sprints table
    CREATE TABLE IF NOT EXISTS sprints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phase_id INTEGER NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      position INTEGER DEFAULT 0,
      status TEXT DEFAULT 'planning' CHECK(status IN ('planning', 'active', 'completed', 'archived')),
      goal TEXT,
      start_date TEXT,
      end_date TEXT,
      target_repo_path TEXT,
      target_repo_url TEXT,
      base_branch TEXT DEFAULT 'main',
      sprint_branch TEXT,
      orchestrator_status TEXT DEFAULT 'idle' CHECK(orchestrator_status IN ('idle', 'initializing', 'running', 'paused', 'completed', 'failed')),
      orchestrator_stage TEXT,
      orchestrator_progress INTEGER DEFAULT 0,
      orchestrator_error TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Sprint agent runs table
    CREATE TABLE IF NOT EXISTS sprint_agent_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sprint_id INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
      agent_name TEXT NOT NULL,
      agent_type TEXT NOT NULL CHECK(agent_type IN ('tech_lead', 'api_architect', 'senior_dev', 'qa', 'purple_team', 'performance', 'docs_writer', 'code_janitor', 'red_team', 'black_team')),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
      branch_name TEXT,
      started_at TEXT,
      completed_at TEXT,
      output_summary TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Sprint quality gates table
    CREATE TABLE IF NOT EXISTS sprint_quality_gates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sprint_id INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
      gate_name TEXT NOT NULL,
      gate_type TEXT NOT NULL CHECK(gate_type IN ('automated', 'manual')),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'passed', 'failed', 'skipped')),
      score INTEGER,
      max_score INTEGER,
      passed_at TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Phase and Sprint indexes
    CREATE INDEX IF NOT EXISTS idx_phases_project ON phases(project_id);
    CREATE INDEX IF NOT EXISTS idx_phases_status ON phases(status);
    CREATE INDEX IF NOT EXISTS idx_sprints_phase ON sprints(phase_id);
    CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);
    CREATE INDEX IF NOT EXISTS idx_sprints_orchestrator ON sprints(orchestrator_status);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_sprint ON sprint_agent_runs(sprint_id);
    CREATE INDEX IF NOT EXISTS idx_quality_gates_sprint ON sprint_quality_gates(sprint_id);
  `);

  // Run migrations for existing databases
  runMigrations(db);

  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
