Read the specified file and check:
1. TypeScript strict violations (any, implicit types, non-null assertions)
2. Compliance with ARCHITECTURE.md standards
3. Compliance with CLAUDE.md code standards (no console.log, no magic numbers)
4. Adequate test coverage
5. Unhandled edge cases or missing error handling

If issues are found: fix them directly and commit with `chore: review fixes in <file>`.
If no issues: output "✓ Clean".
