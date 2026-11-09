# Contributing

This repository is a maintained fork (`SanHsien/HowToLiveBetter`) of [`doggy8088/HowToLiveBetter`](https://github.com/doggy8088/HowToLiveBetter) (originally authored by [`yihong0618/HowToLiveBetter`](https://github.com/yihong0618/HowToLiveBetter)).

## What this means in practice

- **Single maintainer**: The maintainer verifies changes locally with [`tools/dev_check.ps1`](tools/dev_check.ps1) and pushes directly to `origin/main`.
- **Target repo boundary**: Pull requests, pushes, and releases in this repository are strictly targeted at `SanHsien/HowToLiveBetter`.
- **Upstream contributions**: Fixes or improvements intended for upstream must be confirmed in advance during the current task conversation before submitting upstream pull requests to `doggy8088/HowToLiveBetter`.

## Reporting a problem

- A factual error, typo, or content enhancement in the **book content** (`book/`, `docs/`) that applies upstream should be submitted or reported to `doggy8088/HowToLiveBetter`.
- Issues with **this fork's maintenance tooling** (`tools/dev_check.ps1`, `tools/check_upstream_updates.py`, workflows, or documentation) belong here in `SanHsien/HowToLiveBetter`.

## Local verification

Before committing and pushing changes:
1. Ensure all checks in `pwsh -NoProfile -File tools\dev_check.ps1` pass cleanly.
2. Review [`FORK.md`](FORK.md) and [`AGENTS.md`](AGENTS.md) for full context.
