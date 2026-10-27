---
name: setup
description: Set up TinyCloud on this computer. Installs the TinyCloud CLI into a folder that only the tc-apps skill uses, then carries on with the owner's request. Use when the owner asks to set up, install or connect TinyCloud, and when tc-apps says TC_BIN or TC_BETA is unset or can't find one of its own files.
---

# Set up TinyCloud

This plugin already holds the `tc-apps` skill, copied unchanged from <https://agents.tinycloud.xyz/skills/apps/> and checked against its `SHA256SUMS`. Its files are in this folder, called `<SKILL_DIR>` below:

```text
${CLAUDE_PLUGIN_ROOT}/skills/tc-apps
```

This page installs the rest: the TinyCloud CLI, in a folder that only the skill uses. It is the setup at <https://agents.tinycloud.xyz/apps>, with one change: the skill's files come from this plugin, so nothing is downloaded and nothing is copied into a skills folder.

Keep the owner's request, and carry it on after setup, in this same conversation. Your client is `claude-code`.

What is and isn't secret: <https://agents.tinycloud.xyz/agent#what-is-and-isnt-secret>. Never ask the owner for a password, private key, API key or token. The owner approves access on OpenKey, from a link and code you show them.

Run each block as one shell tool call, exactly as written. Install nothing else: the only installs are the two `npm install --prefix` steps below. Never `npm install -g`, `sudo` or `curl … | sh`. Don't use or change a `tc` on the `PATH`: other tools depend on it.

## 1. Check

```sh
node --version
npm --version
printenv TC_BIN || "$HOME/.local/share/tc-apps/cli/node_modules/.bin/tinycloud" --version
```

- `node` older than `v22.20.0`, or `node` or `npm` not found → stop and tell the owner: "TinyCloud setup needs Node.js 22.20 or later, with npm. Install or update it, then ask me again." Don't install Node.js yourself.
- The last line prints a path (the owner set `TC_BIN`) or exactly `1.3.5` → the CLI is ready: skip step 2, and run the other steps.
- Anything else, such as `No such file or directory` → run every step.

## 2. Install

Tell the owner in one line that you're installing the TinyCloud CLI. Then run these steps in order, each as its own shell call. Stop at the first step that fails, and report the error. Don't retry it with other options or in another folder.

**Step 1. Folders.** The CLI's profile store, the skill's state folder, and a folder for the skill's scripts.

```sh
mkdir -p -m 700 "${TC_HOME:-$HOME}/.tinycloud" "${TC_APPS_STATE:-$HOME/.local/state/tc-apps}" "$HOME/.local/share/tc-apps/skill"
```

**Step 2. The CLI,** unless §1 said it is ready. It goes into a private folder that only the skill uses.

```sh
npm install --prefix "$HOME/.local/share/tc-apps/cli" --no-audit --no-fund @tinycloud/cli@1.3.5
```

**Step 3. The CLI for the per-app layout,** in a folder of its own. This step skips the install if that version is already there.

```sh
B="$HOME/.local/share/tc-apps/cli-beta/node_modules/.bin/tinycloud"; { [ -x "$B" ] && [ "$("$B" --version)" = 1.5.0-beta.2 ]; } || npm install --prefix "$HOME/.local/share/tc-apps/cli-beta" --no-audit --no-fund @tinycloud/cli@1.5.0-beta.2
```

**Step 4. Copy the skill's files from this plugin, and check them.** Step 5 and the owner's Undo and move scripts use this copy. Every file must print `OK`. Anything else: stop.

```sh
cd "${CLAUDE_PLUGIN_ROOT}/skills/tc-apps" && cp -- * "$HOME/.local/share/tc-apps/skill/" && cd "$HOME/.local/share/tc-apps/skill" && { sha256sum -c SHA256SUMS || shasum -a 256 -c SHA256SUMS; }
```

**Step 5. The helper script.** `cli-path` names the CLI. `tinycloud` is the skill's `tc-wrapper.sh`: a short script that runs that CLI and retries when TinyCloud drops a connection.

```sh
printf '%s\n' "${TC_BIN:-$HOME/.local/share/tc-apps/cli/node_modules/.bin/tinycloud}" > "$HOME/.local/share/tc-apps/cli-path" && cp "$HOME/.local/share/tc-apps/skill/tc-wrapper.sh" "$HOME/.local/share/tc-apps/tinycloud" && chmod 755 "$HOME/.local/share/tc-apps/tinycloud"
```

**Step 6. Check the CLIs run.** The first prints `1.3.5`, or the version of the owner's `TC_BIN`. The second prints `1.5.0-beta.2`, or the version of the owner's `TC_BETA_BIN`.

```sh
"$HOME/.local/share/tc-apps/tinycloud" --version
"${TC_BETA_BIN:-$HOME/.local/share/tc-apps/cli-beta/node_modules/.bin/tinycloud}" --version
```

Don't copy the skill into `~/.claude/skills` or `~/.agents/skills`: this plugin provides it, and a second copy would load twice. If an earlier setup left a copy in `${CLAUDE_CONFIG_DIR:-~/.claude}/skills/tc-apps`, leave it as it is, and tell the owner they can delete that folder now that the plugin provides the skill.

If Claude Code denies a step or asks the owner to confirm it, show the owner the step and what it does, and ask them to reply naming it, for example "Go ahead: install the TinyCloud CLI." Run it again only once they agree. Don't edit their settings files, and don't run the step another way.

## 3. Carry on with the skill

Read the skill in full:

```sh
cat "${CLAUDE_PLUGIN_ROOT}/skills/tc-apps/SKILL.md"
```

Follow it now for the owner's request, from its §1.

**The skill's other files are in `<SKILL_DIR>`.** The skill looks for `TINY-APPS.md`, `layout.sh`, `SQL.md`, `LEGACY-SQL.md`, `announce.sh` and `migrate.sh` in `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills/tc-apps` or `$HOME/.agents/skills/tc-apps`. With this plugin, they are in `<SKILL_DIR>`. When one of the skill's blocks loops over those two folders, add `<SKILL_DIR>` as the first folder in the loop, and change nothing else.

**Setup only.** The default record is the one the setup page saves:

If the owner only asked for setup or named no record, save one default record without asking, after sign-in is approved (skill §1a, §3 and §4) and not before: app `todos`, kind `todo`, value `{"v":1,"at":"<UTC>","data":{"title":"Try my personal apps"},"by":<client>}`, where `<UTC>` is the clock's time from `date -u +%FT%TZ` (skill §1; run it again if it is more than 5 minutes old), never an estimate. Run skill §1a for `todos` first. If it prints `legacy`, an earlier version already keeps `todos` records for this owner: use the old layout (skill `LEGACY.md`, no new approval) with key `xyz.tinycloud.agent-data/todos/todo/open/try-my-personal-apps` and done twin `xyz.tinycloud.agent-data/todos/todo/done/try-my-personal-apps`, and, if they don't exist yet, the catalog records `xyz.tinycloud.agent-data/catalog/todos` and `xyz.tinycloud.agent-data/catalog/todos/todo`. Otherwise use the new layout in the `applications` space with key `xyz.tinycloud.tinyapps.todos/todo/open/try-my-personal-apps`, done twin `xyz.tinycloud.tinyapps.todos/todo/done/try-my-personal-apps`, and catalog records `xyz.tinycloud.tinyapps.todos/catalog` and `xyz.tinycloud.tinyapps.todos/catalog/todo`, followed by the discovery entry `xyz.tinycloud.tinyapps.catalog/todos/entry` = `{"v":1,"app":"todos","id":"xyz.tinycloud.tinyapps.todos","title":"Todos"}`. If the `todos` app or its `todo` kind doesn't exist yet, write the catalog records first (skill §2 rule 2): the app record is `{"app":"todos","title":"Todos","about":"Things to do.","created":"<TODAY>","by":<client>}` and the kind record is `{"app":"todos","kind":"todo","about":"One record per thing to do.","shape":"item","states":["open","done"],"v":1,"fields":{"title":"text: what to do"}}`. Write commands are in skill §6 (`LEGACY.md` §6 in the old layout). Get that key and its done twin first (skill §5), and skip saving if either exists, so a todo the owner already ticked off isn't saved again. Afterwards tell the owner the key, that “What’s on my todo list?” shows it, and that you'll delete it on request (the skill's `kv delete`, §6).
