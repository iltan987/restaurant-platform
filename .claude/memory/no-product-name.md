---
name: no-product-name
description: "The project has no name yet; never put any product name in code, UI, commits, or history"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: f95397de-ff29-4398-8f48-ea11be2fd046
---

The project is **unnamed**. Don't introduce any product name into code, UI copy, comments, storage keys, commit messages, docs, or memory files.

The Claude Design handoff bundle ships a placeholder brand name — treat it as a stand-in and strip it; it must never be committed (the name is reserved). The user flagged this repeatedly, and a name baked into history is expensive to remove — it required rewriting the branch's commit messages and blobs.

**How to apply:** use neutral labels until a name is chosen — the admin app brands itself "Konsol" / "Yönetim Konsolu", the tenant host shown in the UI derives from `NEXT_PUBLIC_DASHBOARD_URL`, and placeholder users are generic ("Geliştirici"). When any external source (design bundle, mockup) supplies a name, drop it before writing code or commits. Related: [[dashboard-design-direction]].
