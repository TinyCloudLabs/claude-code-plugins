# TinyCloud plugin

Keeps your personal records, like weight, workouts, goals and todos, in your own TinyCloud storage.

It has two skills:

- `tc-apps`: TinyCloud's skill for your records. It is copied unchanged from <https://agents.tinycloud.xyz/skills/apps/> and checked against the site's `SHA256SUMS`.
- `setup`: installs the TinyCloud CLI that `tc-apps` needs, into `~/.local/share/tc-apps`. It runs only when you ask, for example "Set up TinyCloud for me".

Install steps, what it changes on your computer, and how to remove it: see the [README](https://github.com/TinyCloudLabs/claude-code-plugins#readme).
