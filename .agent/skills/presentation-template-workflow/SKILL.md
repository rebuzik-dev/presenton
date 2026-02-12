---
name: presentation-template-workflow
description: Create, refactor, and quality-check Next.js presentation slide templates in `servers/nextjs/presentation-templates/*`. Use when adding new template folders, creating new `.tsx` slide layouts, renaming layout files, fixing clipping/overlap, adjusting typography and spacing, or verifying that templates are loaded by `/api/templates` and selected correctly via `settings.json`.
---

# Presentation Template Workflow

## Overview

Use this workflow to safely modify and create slide layouts that render inside a `1280x720` slide container without clipping text or images.

## Workflow

1. Identify template scope.
- Find target template folder in `servers/nextjs/presentation-templates/<template-id>/`.
- Decide whether task is:
  - Create new layout file
  - Refactor existing layout
  - Fix visual defects (clipping/overlap/spacing)
  - Make template default/non-default

2. Enforce file and export contract.
- Keep each layout as `.tsx`.
- Export required symbols from each layout file:
  - `export { Schema, layoutId, layoutName, layoutDescription }`
  - `export default <Component>`
- Keep unique `layoutId` per file inside a template.
- Keep `Schema` defaults realistic for preview rendering.

3. Enforce template registration contract.
- Keep `settings.json` in each template folder:
  - `description: string`
  - `ordered: boolean`
  - `default: boolean`
- Remember `/api/templates` only includes directories with at least one `.tsx` layout file.
- Set `"default": true` only when explicitly requested.

4. Apply anti-clipping layout rules.
- Remove `overflow-hidden` from text nodes unless truncation is explicitly intended.
- Prefer reducing typography and spacing before increasing container height.
- Keep title hierarchy balanced so large headings do not starve body/list blocks.
- Keep bottom breathing room in tall image/card blocks to avoid cropping at slide boundary.
- For dense text sections, reduce:
  - font size
  - line-height
  - vertical margins (`mt-*`, `pt-*`, `pb-*`)
- Use the constraints guide in `references/layout-constraints.md`.

5. Enforce visual consistency across the whole template.
- Keep non-heading text unified across slides unless there is a clear semantic reason.
- Default body/list text standard: `text-[24px] leading-[32px] font-[500]`.
- Keep differences only for:
  - main slide title
  - section/column headers
  - compact utility labels (e.g. hex codes, tiny overlays)
- Keep semantically single text as a single visual block.
  - Do not split one phrase into mixed weights unless explicitly requested.
- Keep mirrored structures symmetric.
  - If one column has a separator or spacing pattern, match it in the opposite column.
  - If asymmetry is intentional, document it in a short code comment.

6. Validate quickly before finishing.
- Check template file discovery:
  - `rg --files servers/nextjs/presentation-templates/<template-id>`
- Check required exports:
  - `rg -n "export default|export \\{ Schema, layoutId, layoutName, layoutDescription \\}" servers/nextjs/presentation-templates/<template-id> --glob "*.tsx"`
- Check obvious clipping risk:
  - search for aggressive heights and hidden overflow in text-heavy zones.
- If visual bug report exists, confirm each reported symptom is mapped to a concrete CSS/class change.
- Check typography drift:
  - verify body/list text sizes and leading are consistent in all slides of the template.
- Check structural symmetry:
  - compare left/right column separators, spacing, and vertical rhythm in two-column layouts.

## Change Patterns

### Create New Layout

1. Copy a stable layout from same template family.
2. Rename file in clear PascalCase form ending with `SlideLayout.tsx`.
3. Update `layoutId`, `layoutName`, `layoutDescription`, `Schema`, and component JSX.
4. Keep structure compatible with existing renderer assumptions.

### Fix Clipping and Overlap

1. Start with problematic zone only (title, list, cards, quote block).
2. Reduce vertical pressure incrementally:
- heading size/leading
- section `mt-*`
- card/image fixed heights
3. Remove text `overflow-hidden` in content containers.
4. Re-check lower-bound clipping first, then fine-tune visual balance.

## References

- `references/layout-constraints.md`: Practical sizing and spacing constraints for this project.
