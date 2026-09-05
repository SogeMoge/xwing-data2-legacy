# X-Wing Data 2 (Legacy) — LLM Codebase Guide

## 1. Project Overview & Identity
- **Repository**: `xwing-data2-legacy` (Fork/continuation maintained by Artem Kropachev `@SogeMoge`, original by Guido Kessels).
- **Domain**: Star Wars: X-Wing Miniatures Game (Second Edition / 2.0 Legacy community format).
- **Core Purpose**: The canonical, structured JSON database for all ships, pilots, upgrades, conditions, damage decks, factions, quick-builds, actions, and stats in X-Wing 2.0 Legacy.
- **Ecosystem Role**: Primary upstream data source for squad builders (e.g., YASB Legacy, Launch Bay Next, 4-A7 Discord bot) and digital simulators (TTS, Vassal).
- **Language & Runtime**: Pure JSON data repository managed with Node.js (v16–v18+), Yarn/NPM, Jest test suite, and auxiliary Python 3 maintenance scripts.

---

## 2. Directory Structure & Key Files

```text
xwing-data2-legacy/
├── AGENTS.md                           # Master codebase guide for LLMs & AI agents
├── data/                               # THE DATABASE (All canonical game data in JSON)
│   ├── manifest.json                   # [CRITICAL ENTRY POINT] Master index of all active data files
│   ├── actions/actions.json            # Base action definitions (Focus, Lock, Evade, etc.)
│   ├── conditions/conditions.json      # Condition cards assigned by abilities
│   ├── damage-decks/core.json          # Damage deck cards and critical hit effects
│   ├── factions/factions.json          # Faction definitions (7 factions: rebel, imperial, scum, etc.)
│   ├── stats/stats.json                # Ship stat types (agility, hull, shields, arcs, etc.)
│   ├── quick-builds/<faction>.json     # Standardized quick-build squad definitions
│   ├── pilots/<faction>/<ship>.json    # Ship definitions + all pilot cards for that ship
│   ├── upgrades/<slot>.json            # Upgrade cards grouped by slot (talent, crew, etc.)
│   ├── localization.pilots.json        # Multi-language pilot names
│   ├── translation.json                # Text translations (en, fr, de, es)
│   └── ffg-xws.json                    # Mapping of legacy FFG IDs to XWS IDs
├── tests/                              # JEST VALIDATION SUITE
│   ├── schemas/                        # JSON Schemas enforcing data structure
│   │   ├── ship.schema.json            # Schema for ship statistics, dials, actions
│   │   ├── pilot.schema.json           # Schema for pilot cards
│   │   ├── upgrade.schema.json         # Schema for upgrades, costs, restrictions
│   │   └── quick-build.schema.json     # Schema for quick builds
│   ├── helpers/
│   │   ├── data.js                     # Manifest loader, XWS collectors, and slot validators
│   │   └── keywords.js                 # Verifies bracketed keyword formatting (e.g. [Focus], [Hit])
│   ├── pilots.test.js                  # Validates every ship and pilot against schemas & keywords
│   ├── upgrades.test.js                # Validates every upgrade against schemas & keywords
│   ├── quick-builds.test.js            # Validates quick builds and references valid XWS IDs
│   └── xws.test.js                     # Enforces global uniqueness of XWS IDs
├── scripts/                            # SCRAPING, INGESTION & ASSET TOOLS
│   ├── ffgscrape.js                    # Downloads raw JSON from FFG API
│   ├── ffgprocess.js                   # Ingests downloaded cards into data/ files with git diffs
│   ├── ffg2xws.js                      # Generates data/ffg-xws.json mappings
│   ├── ffgtranslations.js              # Updates translation.json from localized FFG data
│   ├── hyperspace.js                   # Syncs Hyperspace format legality flags
│   └── updatePilotImages.py            # Batch updates/validates image URLs against Goldenrod CDN
└── package.json                        # NPM scripts, dependencies, Jest config, lint-staged
```

---

## 3. Core Entry Point: `data/manifest.json`

The entire database is indexed by [`data/manifest.json`](data/manifest.json).
- **Every data file must be registered here**. If a new ship file or upgrade category is added to `data/`, the test suite and downstream consumers will **ignore** it unless it is listed in `manifest.json`.
- Structure:
  - `"version"`: SemVer version string (e.g. `"3.9.1"`).
  - `"factions"`, `"stats"`, `"actions"`, `"damagedecks"`, `"conditions"`: Array of file paths.
  - `"pilots"`: Array of `{ "faction": "<faction_slug>", "ships": ["data/pilots/..."] }`.
  - `"upgrades"`: Array of `"data/upgrades/<slot_slug>.json"`.
  - `"quick-builds"`: Array of `"data/quick-builds/<faction_slug>.json"`.

---

## 4. Key Data Entities & Schemas

### 4.1 Ships & Pilots (`data/pilots/<faction>/<ship-slug>.json`)
Each file represents a single ship type within a specific faction and houses both the chassis statistics and an array of all pilots flying it.

- **Ship Schema ([`tests/schemas/ship.schema.json`](tests/schemas/ship.schema.json))**:
  - `name`: String (e.g., `"T-65 X-wing"`).
  - `xws`: Slug string (e.g., `"t65xwing"`).
  - `size`: `"Small" | "Medium" | "Large" | "Huge"`.
  - `faction`: `"rebelalliance" | "galacticempire" | "scumandvillainy" | "resistance" | "firstorder" | "galacticrepublic" | "separatistalliance"`.
  - `dial`: Array of strings encoded as `[Speed][Bearing][Difficulty]`:
    - Speed: `0` to `5`
    - Bearing: `T` (Turn Left), `B` (Bank Left), `F` (Straight), `N` (Bank Right), `Y` (Turn Right), `K` (Koiogran Turn), `L` (Segnor's Loop Left), `P` (Segnor's Loop Right), `E` (Tallon Roll Left), `R` (Tallon Roll Right), `S` (Stationary), `A` (Reverse).
    - Difficulty: `B` (Blue), `W` (White), `R` (Red), `P` (Purple).
    - Example: `"1BB"` (Speed 1, Bank Left, Blue), `"4KR"` (Speed 4, K-Turn, Red).
  - `dialCodes`: Array of legacy/short aliases (e.g. `["XW", "T65"]`).
  - `stats`: Array of `{ "type": "attack|agility|hull|shields|energy", "value": int, "arc"?: string, "recovers"?: int }`.
  - `actions`: Array of `{ "difficulty": "White|Red|Purple", "type": "<ActionName>", "linked"?: { "difficulty": ..., "type": ... } }`.
  - `icon`: URL to ship icon.

- **Pilot Schema ([`tests/schemas/pilot.schema.json`](tests/schemas/pilot.schema.json))**:
  - `name`: Pilot name (e.g., `"Wedge Antilles"`).
  - `caption`: Subtitle/callsign (e.g., `"Red Two"`).
  - `initiative`: Integer `0` to `8`.
  - `limited`: Integer (`0` = generic, `1` = unique/•, `2` = ••, `3` = •••).
  - `cost`: Points cost (integer $\ge 0$).
  - `xws`: Unique pilot identifier.
  - `ability` / `text`: Ability text (or flavor text for non-ability pilots).
  - `slots`: Array of upgrade slot names (e.g. `["Talent", "Torpedo", "Astromech", "Modification"]`).
  - `standardLoadout`: (Mutually exclusive with `slots`) Array of upgrade XWS IDs for pre-built Quick Build / Standard Loadout pilots.
  - `standard`, `wildspace`, `epic`: Booleans for format legality.
  - `keywords`: Array of tags (e.g. `["X-wing"]`).
  - `image` & `artwork`: URLs hosted on GitHub Goldenrod CDN.

### 4.2 Upgrades (`data/upgrades/<slot-slug>.json`)
Each file contains an array of upgrade objects for that slot type.

- **Upgrade Schema ([`tests/schemas/upgrade.schema.json`](tests/schemas/upgrade.schema.json))**:
  - `name`: Card name (e.g., `"Crack Shot"`).
  - `limited`: Integer (`0` = non-limited, `1` = unique).
  - `xws`: Unique upgrade identifier.
  - `cost`: Points cost structure:
    - Fixed: `{ "value": 3 }`
    - Scaled by base size: `{ "variable": "size", "values": { "Small": 2, "Medium": 4, "Large": 6, "Huge": 8 } }`
    - Scaled by agility: `{ "variable": "agility", "values": { "0": 2, "1": 3, "2": 5, "3": 8 } }`
    - Scaled by initiative: `{ "variable": "initiative", "values": { "0": 1, ... } }`
  - `sides`: Array of upgrade faces (supports dual-sided / flip cards):
    - `title`, `type` (slot name), `ability`, `slots`, `charges`, `attack`, `actions`, `image`, `artwork`.
  - `restrictions`: Array of requirement objects (e.g., `factions`, `sizes`, `ships`, `action`, `keywords`).
  - `standard`, `wildspace`, `epic`: Booleans.
  - `standardLoadoutOnly`: Boolean indicating if restricted only to Standard Loadout cards.

---

## 5. Critical Conventions & Invariants

### 5.1 XWS ID Generation Rules
Every ship, pilot, upgrade, and condition has an `xws` field. XWS IDs:
1. Must be strictly lowercase alphanumeric and hyphens: `^[a-z0-9-]+$`.
2. Must remove accents/umlauts and convert to closest ASCII equivalent.
3. Must be **unique per type**:
   - Pilot IDs cannot collide with other pilot IDs.
   - Upgrade IDs cannot collide with other upgrade IDs.
   - Collision resolution hierarchy:
     - Pilots: `<pilotname>-<shipname>-<factionname>-<productsku>` (e.g. `hansolo-modifiedyt1300lightfreighter`)
     - Upgrades: `<upgradename>-<slotname>-<productsku>` (e.g. `hansolo-gunner`)
     - Conditions: `<conditionname>-<productsku>`
4. **X2PO Legacy-Original Releases**:
   - Even though pilot IDs can normally be shared across different ship chassis, cards designed by the X2PO team for Legacy releases typically include a `-<productsku>` suffix identifying the pack (e.g., `<name>-<productsku>` like `corranhorn-lsl` or `-wat1`).
   - When adding a new pilot or upgrade, the agent must ask the user whether it is an X2PO Legacy release and what `<productsku>` suffix to use.

### 5.2 Bracketed Game Keywords
Text fields (`ability`, `text`, `shipAbility.text`) must enclose game terminology in brackets for UI symbol rendering:
- Actions: `[Focus]`, `[Lock]`, `[Barrel Roll]`, `[Boost]`, `[Evade]`, `[Calculate]`, `[Reinforce]`, `[Cloak]`, `[Coordinate]`, `[Jam]`, `[Reload]`, `[SLAM]`, `[Rotate Arc]`
- Arcs: `[Front Arc]`, `[Rear Arc]`, `[Bullseye Arc]`, `[Single Turret Arc]`, `[Double Turret Arc]`, `[Full Front Arc]`, `[Left Arc]`, `[Right Arc]`
- Dice & Tokens: `[Hit]`, `[Critical Hit]`, `[Evade]`, `[Focus]`, `[Charge]`, `[Force]`, `[Shield]`, `[Energy]`
- Maneuvers: `[Turn Left]`, `[Bank Right]`, `[Straight]`, `[Koiogran Turn]`, etc.
- Allowed keywords are verified strictly in [`tests/helpers/keywords.js`](tests/helpers/keywords.js). Any unrecognized `[Token]` will cause unit tests to fail.

### 5.3 Image & Artwork URLs
Cards generally point to the 2.0-legacy branch of the Goldenrod repository:
- Pilots Image: `https://raw.githubusercontent.com/SogeMoge/x-wing2.0-project-goldenrod/2.0-legacy/src/images/En/pilots/<xws>.png`
- Pilots Artwork: `https://raw.githubusercontent.com/SogeMoge/x-wing2.0-project-goldenrod/2.0-legacy/src/images/Art/pilots/<xws>.png`
- Upgrades Image: `https://raw.githubusercontent.com/SogeMoge/x-wing2.0-project-goldenrod/2.0-legacy/src/images/En/upgrades/<xws>.png`
- Upgrades Artwork: `https://raw.githubusercontent.com/SogeMoge/x-wing2.0-project-goldenrod/2.0-legacy/src/images/Art/upgrades/<xws>.png`
- Ship Icons: `https://infinitearenas.com/xw2/images/shipicons/<faction>/...`

---

## 6. Developer & LLM Workflows

### 6.1 Adding or Editing Data
1. **New Ship**:
   - Create `data/pilots/<faction>/<ship-slug>.json`.
   - Register the file path in `data/manifest.json` under `"pilots"` -> matching faction.
   - Verify dials, stats, and pilots.
2. **New Pilot**:
   - Locate the target ship JSON file in `data/pilots/<faction>/<ship-slug>.json`.
   - Append to the `pilots` array adhering to `pilot.schema.json`.
   - Check that `xws` is unique across all pilot files.
3. **New Upgrade**:
   - Locate `data/upgrades/<slot-slug>.json`.
   - Append to the array adhering to `upgrade.schema.json`.
   - Check that `xws` is unique across all upgrade files.
4. **Updating Points**:
   - Edit the `"cost"` field in the relevant pilot or upgrade entry. Points updates bump the minor semantic version number.

### 6.2 Verification Commands
Run these commands from the repository root:

```bash
# 1. Validate all JSON syntax
yarn run validate:json
# or: npm run validate:json

# 2. Run the complete Jest test suite (schemas, keywords, uniqueness, cross-references)
yarn run validate:tests
# or: npm run validate:tests

# 3. Automatically format all data JSON files with Prettier
yarn run format
# or: npm run format
```

### 6.3 Release & Versioning
- This repository adheres to **Semantic Versioning (SemVer)**:
  - `PATCH`: Fix typos, corrections to existing cards, text fixes.
  - `MINOR`: Points updates, new content added (pilots, ships, upgrades) or backward-compatible schema changes.
  - `MAJOR`: Breaking schema changes that alter the shape expected by downstream consumers.
- Version is synchronized in both [`package.json`](package.json) and [`data/manifest.json`](data/manifest.json).

