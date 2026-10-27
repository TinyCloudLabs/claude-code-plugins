# TinyCloud for Claude Code

TinyCloud keeps your personal records, like weight, workouts, goals and todos, in your own storage. This repository is a Claude Code plugin marketplace. It has one plugin, `tinycloud`.

## Install

You need Node.js 22.20 or later, with npm.

In Claude Code, run:

```text
/plugin marketplace add TinyCloudLabs/claude-code-plugins
/plugin install tinycloud@tinycloudlabs
```

The second command opens the plugin's details. Choose **Install for you (user scope)**, so it works in every project.

Then ask Claude Code:

```text
Set up TinyCloud for me
```

Claude installs the TinyCloud CLI and saves a first todo, so you can see it works. You approve access on OpenKey, from a link and code Claude shows you. After that, just ask, for example "Log my weight: 80.5 kg today."

You can also install from your shell:

```sh
claude plugin marketplace add TinyCloudLabs/claude-code-plugins
claude plugin install tinycloud@tinycloudlabs
```

## What it installs

When you install the plugin, Claude Code adds two skills to its plugin folder, `~/.claude/plugins`:

- `tinycloud:tc-apps`: TinyCloud's skill for your records, version 0.2.1. It is copied unchanged from <https://agents.tinycloud.xyz/skills/apps/> and checked against the site's `SHA256SUMS`.
- `tinycloud:setup`: the setup from <https://agents.tinycloud.xyz/apps>. It uses the plugin's copy of the skill, so it doesn't copy anything into `~/.claude/skills`.

When you ask Claude to set up TinyCloud, it also adds:

- The TinyCloud CLI, `@tinycloud/cli` 1.3.5 and 1.5.0-beta.2, in `~/.local/share/tc-apps`. It uses `npm install --prefix`. Nothing is installed globally, and nothing runs with `sudo`. A `tc` on your `PATH` stays as it is.
- Your sign-ins in `~/.tinycloud`, and the skill's state in `~/.local/state/tc-apps`.

The plugin has no hooks and no MCP server. Nothing runs until you ask.

### Why no MCP server

A plugin can include a remote MCP server, and Claude Code signs in to it with OAuth through `/mcp` ([MCP docs](https://code.claude.com/docs/en/mcp)). TinyCloud's hosted server, `https://mcp.tinycloud.xyz/mcp`, is for chat apps. In coding agents like Claude Code, TinyCloud uses the CLI and the `tc-apps` skill instead ([agents.tinycloud.xyz/connect](https://agents.tinycloud.xyz/connect)).

With both, Claude would have two ways to reach the same records, each with its own approval. Claude Code would also ask you to sign in to the server at every start until you did.

To use the hosted server in Claude Code anyway, run:

```sh
claude mcp add --transport http tinycloud https://mcp.tinycloud.xyz/mcp
```

## If you set up TinyCloud before

The setup link put a copy of the skill in `~/.claude/skills/tc-apps`. Delete that folder after you install the plugin, so Claude Code doesn't load two copies.

## Remove it

In Claude Code, run:

```text
/plugin uninstall tinycloud@tinycloudlabs
/plugin marketplace remove tinycloudlabs
```

Removing the marketplace also uninstalls its plugins.

To remove the CLI as well:

1. End the agent's access, in your own terminal, as [Undo](https://agents.tinycloud.xyz/apps#undo) describes.
2. Delete `~/.local/share/tc-apps` and `~/.local/state/tc-apps`.

Your records stay in your TinyCloud.

## For maintainers

- `plugins/tinycloud/skills/tc-apps/` is the live skill, byte for byte, with its `SHA256SUMS`. Don't edit it here. Change it in [TinyCloudLabs/prompts](https://github.com/TinyCloudLabs/prompts) and deploy it.
- `node scripts/sync-skill.mjs` downloads the live skill and checks every file against `SHA256SUMS` and [index.json](https://agents.tinycloud.xyz/skills/index.json). It replaces the bundled copy only if all of them match. On any mismatch it stops and changes nothing.
- After a sync, bump `version` in `plugins/tinycloud/.claude-plugin/plugin.json`. Claude Code keeps users on a version until it changes.
- `node scripts/sync-skill.mjs --check` checks the bundled copy offline. CI runs it on every push.
- Before you push, run `claude plugin validate --strict .` and `claude plugin validate --strict ./plugins/tinycloud`.
- The setup skill uses the CLI versions that <https://agents.tinycloud.xyz/apps> pins. When that page changes them, change the setup skill too.

## Claude Code docs this follows

- [Plugins overview](https://code.claude.com/docs/en/plugins/overview)
- [Add components to a plugin](https://code.claude.com/docs/en/plugins/components)
- [Plugin manifest reference (plugin.json)](https://code.claude.com/docs/en/plugins/manifest-reference)
- [Create a marketplace](https://code.claude.com/docs/en/plugins/create-marketplace)
- [Marketplace reference (marketplace.json)](https://code.claude.com/docs/en/plugins/marketplace-reference)
- [Install and manage plugins](https://code.claude.com/docs/en/plugins/install)
- [Plugin security and trust](https://code.claude.com/docs/en/plugins/security)
- [Skills, including `${CLAUDE_PLUGIN_ROOT}` in skill content](https://code.claude.com/docs/en/skills)
- [MCP, including plugin MCP servers and OAuth](https://code.claude.com/docs/en/mcp)

## License

[MIT](LICENSE)
