# Realm Keeper — Open Questions

Answer inline. Delete this instruction when done.

---

## Calendar & Time

**1. Days per season?**
Plan doesn't specify. Options: 30 (simple), 90 (realistic), per-realm configurable.

> Answer: I think default to 30. but make it a per-realm configureable

**2. Hardcode 4 seasons or make configurable in MVP?**
Rec: hardcode Spring/Summer/Fall/Winter for MVP.

> Answer: 4 seasons by default.

**3. Night watch — 1 watch or sub-segments?**
Is Night a single watch (Morning/Afternoon/Night = 3 per day), or does Make Camp need sub-phases (e.g. watches within Night)?

> Answer: night is a single watch

---

## UI / Styling

**4. Dark mode?**
Options: dark default + toggle, light default + toggle, dark only, system preference.

> Answer: yes

---

## NPC Generation

**5. Auto-gen NPC names in MVP?**
Include naming tables and auto-generate names during procedural NPC creation, or leave name as manual entry?

> Answer: include naming tables and auto-gen. I think allow user to swap out naming names, or add too. 

---

## Data / Content

**6. Cairn & Shadowdark table data — source?**
Do you have the random table data (ancestry, background, weapons, faction types, etc.) in a structured format already, or does it need manual transcription from the books?

> Answer: to start we will just pull it from the website. this is the repo for the cairn site
https://github.com/yochaigal/cairn it will have all the details for the game

---

## Technical

**7. Dexie nested object compound indexes**
WorldDate stored as `{ year, season, day, watch }`. Dexie compound index `[date.year+date.season+date.day]` may not support dotted paths. Options: (A) flatten date fields on stored records (`dateYear`, `dateSeason`, `dateDay`), (B) test and see. Rec: flatten to be safe.

> Answer:
i think we go `{ year, season, day }` and have watch a seperate entry. 

**8. `crypto.getRandomValues` in iPad Safari SW context**
Any known constraints? Rec: test early in Phase 0.

> Answer:sure?
