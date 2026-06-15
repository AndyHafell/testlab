# SWARM_SETUP — five agents on one codebase, one afternoon

This is the gift of this episode: how to run several AI coding agents **in
parallel on the same repo** without them stepping on each other. The trick is one
**git worktree per agent**. Each agent gets its own working directory and its own
branch off the same commit, so five agents can edit the same files at once and
never collide. Merge (or cherry-pick) the good ones at the end.

## Why worktrees, not branches-in-one-checkout

A normal `git checkout` swaps the branch for the *whole* directory — only one
agent can have the tree in a given state at a time. `git worktree add` gives you a
**second physical directory** that shares the same `.git` object store but checks
out a different branch. N agents → N directories → N branches, all live
simultaneously, zero lock contention.

## The pattern

```bash
# from your repo root, off whatever you want to branch from (here: main)
BASE=main

for name in dashboard billing x-inspo docs-yoink push-bench; do
  git worktree add -b "agent-$name" "../worktrees/agent-$name" "$BASE"
done

git worktree list      # see all of them
```

Now you have:

```
../worktrees/agent-dashboard   (branch agent-dashboard)
../worktrees/agent-billing     (branch agent-billing)
../worktrees/agent-x-inspo     (branch agent-x-inspo)
...
```

Spawn one agent per directory. Each works, commits to its own branch, runs its
own tests — fully isolated.

## Spawning the agents

Any way you launch a coding agent works; the point is one **per worktree dir**.
A minimal shell spawn:

```bash
for name in dashboard billing x-inspo; do
  ( cd "../worktrees/agent-$name" \
    && your-agent-cli --prompt-file "./TASK_$name.md" ) &
done
wait
```

Give each agent **only** its own brief and tell it to stay in its directory. If
two agents need the same file (e.g. a shared `app.py`), that's fine — they each
edit their own checkout; you reconcile at merge time.

## Collecting the work

Each agent's output is just a branch. Review and integrate however you like:

```bash
# see exactly what one agent wrote, nothing else
git -C ../worktrees/agent-dashboard diff main..HEAD

# ship it
git merge agent-dashboard
# or take one feature out of a tangled branch
git cherry-pick <commit>
```

Producing a clean, single-feature patch is then trivial — `git diff main..HEAD`
in that worktree is *only* that agent's work. (The `30-x-inspo` patch in this
episode is exactly that: one agent's branch got entangled with two neighbors'
commits during integration, and the clean isolate was recovered by cherry-picking
just the X commits onto a fresh branch off `main` — see its `PROMPT.md`.)

## Cleanup

```bash
git worktree remove ../worktrees/agent-dashboard
git branch -d agent-dashboard        # after you've merged/kept what you want
git worktree prune                   # tidy stale entries
```

## Gotchas

- **One branch can't be checked out in two worktrees.** Each agent needs its own
  branch name. `git worktree add -b <new-branch>` enforces this.
- **Shared object store.** Worktrees share `.git`, so a `git gc` or a force-push
  in one affects all. Don't rewrite shared history mid-run.
- **Live DB / build files.** If your repo bind-mounts or generates files (a SQLite
  DB, a build dir), make sure each worktree gets its own copy or points at its own
  path — otherwise agents fight over one file. Keep generated/live files
  `.gitignore`d so an agent's commit never clobbers prod data.
- **Reconcile, don't pre-merge.** Let each agent finish in isolation. Merging is a
  human (or one orchestrator) step at the end — that's where conflicts get
  resolved with full context.

MIT — yoink the pattern.
