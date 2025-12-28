#!/bin/bash

# Install ProjectPulse /board skill for Claude Code

SKILL_DIR="$HOME/.claude/skills"
SKILL_FILE="$SKILL_DIR/board.md"
SOURCE_FILE="$(dirname "$0")/../skills/board.md"

# Create skills directory if it doesn't exist
mkdir -p "$SKILL_DIR"

# Copy skill file
cp "$SOURCE_FILE" "$SKILL_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Installed /board skill to $SKILL_FILE"
    echo ""
    echo "Usage:"
    echo "  /board list                    - List all tickets"
    echo "  /board add \"Fix bug\"           - Add a ticket"
    echo "  /board move 42 --to in_progress - Move a ticket"
    echo "  /board done 42                 - Complete a ticket"
    echo "  /board scan /path/to/project   - Scan a project"
    echo "  /board status                  - Show board status"
    echo ""
    echo "Make sure ProjectPulse is running: npm run dev"
else
    echo "❌ Failed to install skill"
    exit 1
fi
