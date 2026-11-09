# How to Live Better (Traditional Chinese Edition)

[中文版](README.md) · [Fork Maintenance](FORK.md) · [Agent Guidelines](AGENTS.md) · [Roadmap](ROADMAP.md)

This repository is a maintained fork of [`doggy8088/HowToLiveBetter`](https://github.com/doggy8088/HowToLiveBetter) (originally authored by [`eternity4719/HowToLiveBetter`](https://github.com/eternity4719/HowToLiveBetter)).

It provides a quantified, cost-benefit life decision guide focused on longevity, health, accident response, emergency preparedness, financial savings, legal protections, and career regulations, localized with Traditional Chinese terminology and Taiwan-specific legal/institutional context.

## Governance and Upstream Tracking

- **Dual-Upstream Tracking**: This fork tracks both the Traditional Chinese localization upstream ([`doggy8088`](https://github.com/doggy8088/HowToLiveBetter)) and the original root upstream ([`eternity4719`](https://github.com/eternity4719/HowToLiveBetter)).
- **Taiwan-First Context Authority**: While tracking upstream updates, **all facts, institutions, emergency hotlines, and terminology strictly prioritize official Taiwan data and Traditional Chinese usage**.
- **Target Repository**: Pull requests, pushes, and releases in this repository strictly target `SanHsien/HowToLiveBetter` on the `main` branch.

## Quick Start (Windows)

```powershell
git clone https://github.com/SanHsien/HowToLiveBetter.git C:\GitHub\HowToLiveBetter
cd C:\GitHub\HowToLiveBetter
gh repo set-default SanHsien/HowToLiveBetter
python -m pip install -r requirements-dev.txt
pwsh -NoProfile -File tools/dev_check.ps1
```

## Licenses

- **Text Content** (`book/`, `docs/`, `README.md`): Licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](LICENSE).
- **Code & Tooling** (`tools/`, `skills/`, `index.html`, `.github/`): Licensed under [MIT License](LICENSE-CODE) (Copyright (c) 2026 eternity4719).
