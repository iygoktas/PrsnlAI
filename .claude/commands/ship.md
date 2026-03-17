# /ship command
# Usage: /ship
# Picks the next unchecked task from TASKS.md and implements it autonomously.

Read docs/TASKS.md.
Find the first unchecked [ ] task.

Execute the following steps in order:
1. Read relevant files (ARCHITECTURE.md + any src files the task touches)
2. Write a 3–5 step implementation plan into docs/PLANS.md under a heading for this task
3. Write the code
4. Write tests and run: `npm test -- --testPathPattern=<relevant test file>`
5. If tests pass: `git add -A && git commit -m "<type>(scope): <description>"`
6. Mark the task `[x]` in TASKS.md
7. Report what was completed and what the next task is

On error: fix it yourself twice. On the third failed attempt, stop and explain what you tried and where it's failing.
