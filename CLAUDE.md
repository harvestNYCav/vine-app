@AGENTS.md

# Git safety

Never run `git stash`, `git reset`, `git checkout`, or any other command that changes git state (branches, the index, the working tree, stashes, or history) without asking first. Read-only commands such as `git status`, `git diff` and `git log` are fine.
