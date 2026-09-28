---
name: update-xwing-data2-legacy
description: >-
  Use this skill when adding, modifying, or validating ships, pilots, upgrades, points, quick-builds, or card text in the xwing-data2-legacy repository.
---

# Updating X-Wing Data 2 (Legacy)

This skill guides the agent through modifying and maintaining the [xwing-data2-legacy](file:///p:/xwing-data2-legacy) repository.

For the full architectural breakdown, data schemas, and invariants, consult the project's [AGENTS.md](file:///p:/xwing-data2-legacy/AGENTS.md).

## Mandatory Rules for New Content

### 1. Image URLs for New Cards
> [!IMPORTANT]
> Whenever a **new card** (pilot, upgrade, condition) or ship is added to the game, **never invent, extrapolate, or guess image or artwork URLs**.
> The agent **MUST explicitly ask the user to provide every image-related URL** before finalizing the card data:
> - **Pilots**: Prompt for `image` (full card face) and `artwork` (art cut).
> - **Upgrades**: Prompt for `image` and `artwork` for each face (`sides[].image`, `sides[].artwork`).
> - **Ships**: Prompt for `icon` (ship silhouette/chassis icon) when creating a new ship chassis.
> - **Conditions**: Prompt for `image`.

### 2. Legacy-Original Releases (X2PO Team) & `<productsku>` Suffixes
> [!IMPORTANT]
> Although pilot `xws` IDs can ordinarily be shared across different ship chassis, **Legacy-original cards designed by the X2PO team** typically include a `-<productsku>` suffix of that specific release (e.g., `-wat1`, `-lsl`).
> Whenever a new pilot or upgrade is added, the agent **MUST ask the user**:
> 1. Is this a Legacy-original release created by the X2PO team?
> 2. If yes, what `<productsku>` suffix should be appended to the card's `xws` ID (e.g., `<name>-<productsku>`)?

## Common Workflows

### 1. Adding or Modifying Pilots
1. Locate the ship file under `data/pilots/<faction>/<ship-slug>.json`.
2. **If adding a new pilot**:
   - Ask the user if it is an X2PO Legacy-original release, and if so, what `<productsku>` suffix should be used for its `xws` ID.
   - Request the `image` and `artwork` URLs from the user if not already provided.
3. Add or edit the pilot object in the `pilots` array:
   - Ensure `name`, `initiative`, `limited`, `cost`, and `xws` (including any `<productsku>` suffix) are set.
   - Enclose game symbols and keywords in brackets (e.g., `[Focus]`, `[Front Arc]`, `[Hit]`, `[Charge]`).
   - If adding a standard loadout pilot, provide `standardLoadout: ["upgrade-xws-1", ...]` instead of `slots`.
   - Include the user-provided `image` and `artwork` URLs.
4. Verify that the `xws` identifier is unique across the entire pilot dataset.

### 2. Adding or Modifying Upgrades
1. Locate the slot file under `data/upgrades/<slot-slug>.json`.
2. **If adding a new upgrade**:
   - Ask the user if it is an X2PO Legacy-original release, and if so, what `<productsku>` suffix should be used for its `xws` ID.
   - Request the `image` and `artwork` URLs for each card side/face from the user if not already provided.
3. Add or edit the upgrade card adhering to [tests/schemas/upgrade.schema.json](file:///p:/xwing-data2-legacy/tests/schemas/upgrade.schema.json).
   - Ensure points costs are set (fixed integer or variable object scaling by size/agility/initiative).
   - Include the user-provided `image` and `artwork` URLs in each element of `sides`.
4. Verify `xws` uniqueness across all upgrade files.

### 3. Adding a New Ship
1. Create the new ship file in `data/pilots/<faction>/<ship-slug>.json`.
2. Request the ship `icon` URL from the user if not provided.
3. **Crucial**: Register the file path in [data/manifest.json](file:///p:/xwing-data2-legacy/data/manifest.json) under `"pilots"` for the respective faction.

### 4. Updating Points & Balance Records
1. **Version Bump**:
   - Points updates **MUST bump the minor semantic version number** (e.g., `3.10.0` -> `3.11.0`) in both [`package.json`](file:///p:/xwing-data2-legacy/package.json) and [`data/manifest.json`](file:///p:/xwing-data2-legacy/data/manifest.json).
2. **Apply Changes**:
   - Update points across pilots and upgrades according to the balance sheet/manifest.
   - **Configurable Standard Loadout (LSL) Cards**: Apply points to the customizable `-lsl` cards (e.g. BoY, BoE, SoC), not the fixed Standard Loadout cards (`standardLoadout: [...]`).
   - **Gamemode & Format Moves**: Balance collation columns may specify format movements (e.g. `"MOVE TO STANDARD"` or `"MOVED"`). Toggle `"standard": true` (or `false`) on the target cards in their chassis JSON files.
   - **Keyword Changes**: Collation entries may specify keyword additions (e.g. `ADD "TIE" KEYWORD`). Append the keyword to the card's `keywords` array, and audit all variants (both customizable LSL and standard loadout SL) so card keywords remain aligned.
   - **Disambiguation & Typos**: Check chassis names when pilots share names across ships (e.g. `Garven Dreis` on `T-65 X-wing` vs `ARC-170`), and account for committee spelling typos (e.g. `Depa Billoba` → `Depa Billaba`, `Essara Rill` → `Essara Till`, `Rhys Dallow` → `Rhys Dallows`, `OOM Uplink` → `00-M Uplink`).
3. **Validation & Update Report**:
   - Validate updated values and generate an **Update Report** stored in the `changelog/` directory (e.g., `changelog/<YYYY-MM>-points-update.md`) using the skill validation script:
     ```bash
     node .agents/skills/update-xwing-data2-legacy/scripts/validate_points_update.js <path-to-manifest.json> changelog/<YYYY-MM>-points-update.md
     ```
   - Each report stored in `changelog/` preserves retrospect for historical points updates and includes:
     - Current value from database (before update)
     - Input value from spreadsheet
     - Final updated value in database for comparison
     - Validation status for every card

### 5. Verification & Formatting
Always execute the following checks before concluding changes:

```bash
# 1. Check for JSON syntax issues
npm run validate:json

# 2. Run Jest schema validation, keyword validation, and XWS collision tests
npm run validate:tests

# 3. Format changed files using Prettier
npm run format

# 4. Build and validate GitHub Pages web application
npm run build:pages
```

### 6. Pull Request & Release Workflow

Following verification, formatting, and points sheet synchronization:

1. **Commit & Push to Feature Branch**:
   - Stage all changes (`data/`, `package.json`, `changelog/`, manifests).
   - Commit using `--no-gpg-sign` to avoid hanging on GPG pinentry:
     ```bash
     git commit --no-gpg-sign -m "feat: apply <Month> <Year> points and balance update"
     git push -u origin <branch-name>
     ```
2. **Create Pull Request**:
   - Create a pull request targeting `master` via GitHub MCP tool or GitHub UI with a complete summary of points changes, format movements, keyword updates, and validation results.
3. **Ask User for Confirmation Before Release (Manual Merge Step)**:
   > [!IMPORTANT]
   > Pull request review and merging is a manual process performed by the repository maintainer.
   > **The agent MUST ask the user for confirmation that the pull request has been merged into `master` before creating the release or tag.** Do not proceed to release creation until the user explicitly confirms the merge.
4. **Create GitHub Release & Tag**:
   - Once the user confirms the PR is merged, checkout `master` and pull latest changes:
     ```bash
     git checkout master
     git pull origin master
     ```
   - Execute the release automation script:
     ```bash
     node .agents/skills/update-xwing-data2-legacy/scripts/create_release.js <PR_NUMBER> "<Month Year> Points Update"
     # Example:
     node .agents/skills/update-xwing-data2-legacy/scripts/create_release.js 41 "September 2026 Points Update"
     ```
   - **Tag Naming Invariant**: Tags in this repository **must NOT have a `v` prefix** (e.g. use `3.11.0`, not `v3.11.0`), matching historical repository release conventions.
   - The script automatically creates the tag on `master`, creates the GitHub release with links to the PR and changelog report, and fetches the tag into the local git repository.


