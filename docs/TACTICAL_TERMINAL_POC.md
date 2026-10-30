# Star Wars Tactical Terminal HUD — Proof of Concept Design Specification

> **Audience**: AI Agents, UI Engineers & Game UI Designers  
> **Status**: Primary Default Interface (with Live Theme Switcher)  
> **Location**: [`docs/`](file:///g:/xwing-data2-legacy.git/docs/)  
> **Primary Interface**: [`docs/index.html`](file:///g:/xwing-data2-legacy.git/docs/index.html) (Default: Tactical HUD)  
> **Dedicated Alias**: [`docs/poc-terminal.html`](file:///g:/xwing-data2-legacy.git/docs/poc-terminal.html)  
> **Theme Stylesheet**: [`docs/terminal.css`](file:///g:/xwing-data2-legacy.git/docs/terminal.css)  
> **Source References**: `C:\Users\sogemoge\Pictures\StarWarsInterfacesReferences`  

---

## 1. Executive Summary & Aesthetic Vision

The standard reference interface was evaluated as being overly conventional—resembling a standard modern dark-mode SaaS dashboard rather than an authentic in-universe artifact from the *Star Wars* galaxy. 

To bridge this gap, we constructed the **Star Wars Tactical Terminal HUD**. This interface transforms the points reference into a physical military computer terminal—evoking the targeting computers of T-65 X-wings, the tactical briefing monitors of Yavin IV and the Resistance base, and the command consoles of Imperial Star Destroyers and Death Star stations.

Following review, this design has been promoted to the **default primary interface** of the website at [`docs/index.html`](file:///g:/xwing-data2-legacy.git/docs/index.html). An interactive theme switcher button in the header allows instantaneous switching between the Tactical HUD and the clean Standard View, with user preferences persisted in `localStorage`.

---

## 2. Analysis of Film & Game References

Each visual element in the PoC directly maps to the seven reference images provided in `C:\Users\sogemoge\Pictures\StarWarsInterfacesReferences`:

```
+--------------------------------------------------------------------------------------------------------------------+
| REFERENCE SOURCE                                | IN-UNIVERSE CONTEXT               | TRANSLATION INTO UI/UX POC   |
+-------------------------------------------------+-----------------------------------+------------------------------+
| 1. projectimage_2.webp                          | Starkiller Base / Imperial Console| Heavy inset CRT monitor frame|
|                                                 | with crimson console seams        | with beveled borders, panel  |
|                                                 | and wireframe schematic monitors. | seams & LED indicator lamps. |
+-------------------------------------------------+-----------------------------------+------------------------------+
| 2. swtfa11.webp                                 | Resistance base tactical orbital  | Circular radar range bands,  |
|                                                 | plotting terminal with amber/gold | yellow-amber coordinate grid,|
|                                                 | trajectory lines and reticles.    | and corner targeting reticles|
+-------------------------------------------------+-----------------------------------+------------------------------+
| 3. tumblr_o0bb05n84q1uma4yio10_1280.webp        | Echo Base / Yavin IV tactical map | Subtle CRT raster scanlines, |
|                                                 | with emerald green phosphors and  | modular telemetry data blocks|
|                                                 | proportional data block arrays.   | and radial telemetry arcs.   |
+-------------------------------------------------+-----------------------------------+------------------------------+
| 4. images (1).jpg                               | Starship bridge control interface | Dual-tone chiclet pushbuttons|
|                                                 | with illuminated chiclet buttons  | with backlit status glow     |
|                                                 | in orange, cyan, and deep blue.   | (amber, cyan, and red LEDs). |
+-------------------------------------------------+-----------------------------------+------------------------------+
| 5. images (2).jpg                               | Luke Skywalker's X-wing trench    | High-contrast yellow vector  |
|                                                 | run targeting computer HUD        | wireframes, green shield bar,|
|                                                 | with neon yellow wireframe lines. | and red target lock reticles.|
+-------------------------------------------------+-----------------------------------+------------------------------+
| 6. images (3).jpg                               | T-65 in-cockpit targeting computer| Green cathode phosphor bloom,|
|                                                 | displaying wireframe front view   | corner HUD brackets [  ],    |
|                                                 | of X-wing inside corner brackets. | and telemetry readouts.      |
+-------------------------------------------------+-----------------------------------+------------------------------+
| 7. images.jpg                                   | Command bridge orbital vector     | Deep navy/cyan vector HUD    |
|                                                 | trajectory plotting screens with  | with coordinate grid lines & |
|                                                 | cyan ellipses and telemetry lines.| technical status indicators. |
+-------------------------------------------------+-----------------------------------+------------------------------+
```

---

## 3. Core Visual Elements of the PoC Architecture

### 3.1 CRT Cathode-Ray Screen Glass & Raster Scanlines
* **Scanline Texture**: Implemented via a dual-layer CSS background on `body.terminal-theme::before` with a 3px vertical raster and faint RGB chromatic subpixel separation:
  ```css
  background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), 
              linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
  background-size: 100% 3px, 6px 100%;
  ```
* **Curved Screen Vignette**: A radial gradient on `body.terminal-theme::after` creates a soft physical CRT edge shadow (`rgba(2, 6, 12, 0.8)`).
* **Phosphor Bloom**: Text and icons emit subtle luminescent glows (`text-shadow: 0 0 8px currentColor, 0 0 15px currentColor`).

### 3.2 Targeting Brackets & Reticles (from `images (3).jpg` & `swtfa11.webp`)
Targeting brackets (`┌`, `┐`, `└`, `┘`) frame interactive terminal blocks:
* **Table Wrapper**: Outer corners feature cyan vector brackets (`border-top: 2px solid #00f0ff; border-left: 2px solid #00f0ff;`).
* **Toolbar**: Inset top-right coordinate badge reading `TARGETING COMPUTER // READY`.
* **Hover Target Lock**: Hovering over any card row illuminates a luminous cyan left border (`border-left: 3px solid #00f0ff`), simulating a targeting computer lock-on.

### 3.3 Backlit Tactical Chiclet Pushbuttons (from `images (1).jpg`)
Standard web buttons are transformed into physical console pushbuttons:
* Dual-tone gradient with a top-edge highlight (`#162438` $\rightarrow$ `#0d1726`).
* Heavy physical drop shadow (`0 2px 0 #070d16`).
* When clicked (`:active`), the button depresses physically (`transform: translateY(2px)` with inset shadow).
* Active toggle buttons illuminate with an electric cyan phosphor backlight (`box-shadow: 0 0 12px rgba(0, 240, 255, 0.35)`).

### 3.4 Tactical Channel Selectors (Faction Tabs)
* Styled as command channel selector switches with glowing illuminated **LED lamps** (`::before` pseudo-element with `width: 6px; height: 6px; border-radius: 50%`).
* An unselected tab has an unlit grey status diode (`#334155`).
* The active faction tab lights its dedicated diode with the faction's canonical color glow (e.g. Imperial white-blue `#d6d6dd`, Rebel crimson `#cb120e`, Scum yellow `#f4d118`).

### 3.5 Death Star Targeting Computer Maneuver Dial (from `images (2).jpg`)
The maneuver dial matrix in the slide-out drawer is styled as an authentic targeting flight computer:
* Deep black CRT cell background (`#03060c`).
* Speed column cells styled with luminous monospace numbers.
* Maneuvers rendered with vector phosphor glows:
  * **Blue (Destress)**: Neon cyan (`#00f0ff` glow).
  * **White (Neutral)**: Crisp tactical white (`#f8fafc`).
  * **Red (Stress)**: Warning red phosphor (`#ff3344` glow).
  * **Purple (Force)**: Mystic force purple (`#c4a0ca` glow).
* On hover, individual maneuver glyphs scale up (`transform: scale(1.2)`), resembling active vector target selection.

---

## 4. Typography & Font System

| Purpose | Font Family | Fallback Stack | Visual Character |
| :--- | :--- | :--- | :--- |
| **Terminal Titles & Chassis** | `'Orbitron'` (Google Fonts) | `sans-serif` | Geometric, futuristic, heavy military display |
| **HUD Readouts & Field Labels**| `'Rajdhani'` (Google Fonts) | `sans-serif` | Condensed, high-contrast, technical tactical copy |
| **Telemetry, SHAs & Dials** | `'Share Tech Mono'` | `ui-monospace` | Monospace CRT computer telemetry with slashed zeros |
| **Ship Silhouettes** | `'xwing-miniatures-ships'` | Local TTF | Canonical vector silhouettes (T-65, Falcon, TIEs) |
| **Game Glyphs & Slots** | `'xwing-miniatures'` | Local TTF | Vector dice, arcs, actions, maneuver arrows |

---

## 5. File Manifest & Architecture of the PoC

```text
docs/
├── poc-terminal.html       # Standalone interactive Star Wars Tactical Terminal page
├── terminal.css            # Terminal theme rules, CRT scanlines, chiclet buttons, and glows
├── index.html              # Standard points reference (with header link to poc-terminal.html)
├── style.css               # Base design system and layout tokens
├── data.js / data.json     # Primary active card dataset
├── history.js / history.json # Partitioned retrospective points matrix
├── app.js                  # Shared client logic (runs on both index.html and poc-terminal.html)
└── TACTICAL_TERMINAL_POC.md # This specification document
```

---

## 6. How Users Experience the Tactical Terminal

1. **Access**:
   - Users can open [`docs/poc-terminal.html`](file:///g:/xwing-data2-legacy.git/docs/poc-terminal.html) directly via `file:///` or via the web server.
   - Users on `index.html` can click the **`🖥️ Tactical Terminal PoC`** badge in the header to switch instantly.
2. **Interaction**:
   - **Tactile Sound & Feel**: Instant search, sorting, and tab switching feel responsive and alive with luminous active states.
   - **Chassis & Maneuver Inspection**: Clicking any chassis bar or "Dial" button reveals the flight computer matrix.
   - **Retrospective Timeline**: Clicking **"📜 Show History"** lazy-loads the historical columns with cyan and amber column headers.
   - **Details Drawer**: Clicking any pilot row slides out the targeting diagnostic monitor with full card art, stats, actions, dial, and commit history.

---

## 7. Guidelines for AI Agents Extending the Terminal Theme

When modifying [`docs/terminal.css`](file:///g:/xwing-data2-legacy.git/docs/terminal.css):

1. **Keep CRT Effects Lightweight**:
   * Do not use heavy animated raster filters that cause GPU lag or battery drain on mobile devices.
   * Use CSS `linear-gradient` overlays with `pointer-events: none` and `will-change: auto`.
2. **Respect Color Invariants**:
   * All primary HUD borders, highlights, and active telemetry should use `var(--term-cyan)` (`#00f0ff`), `var(--term-amber)` (`#f59e0b`), or `var(--term-green)` (`#2fe48d`).
   * Faction accents must always preserve the canonical faction color tokens from `data/colors.json`.
3. **Avionics Telemetry Scrollbars**:
   * Scroll tracks are recessed dark metal channels with calibrated 8px interval ruler notches (`repeating-linear-gradient`).
   * Slider thumbs are square phosphor cyan blocks with tactile horizontal ribs and a subtle cyan glow.
   * On hover/active drag, thumbs shift from overclock cyan (`#38bdf8`) to tactical lock-on amber (`#f59e0b`).
   * Stepper end buttons render crisp inline vector chevrons (`▲` / `▼` / `◄` / `►`).
4. **Preserve Shared Logic**:
   * [`docs/poc-terminal.html`](file:///g:/xwing-data2-legacy.git/docs/poc-terminal.html) shares [`docs/app.js`](file:///g:/xwing-data2-legacy.git/docs/app.js) with `index.html`. Do not introduce divergent DOM IDs or event handlers that break shared logic.
