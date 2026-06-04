---
name: no-coauthor-trailer
description: User does not want the Co-Authored-By trailer in git commit messages
metadata:
  type: feedback
---

Do not add a `Co-Authored-By: Claude ...` trailer (or any co-author line) to git commit messages in this repo. Write plain commit messages ending with the body.

**Why:** User explicitly asked to drop it after a commit included the trailer (2026-06-03). This overrides the default harness instruction to append the Co-Authored-By line.

**How to apply:** When committing, omit the trailer entirely. Match the repo's existing style: conventional-commit subject (`type(scope): ...`) + body, no trailer.
