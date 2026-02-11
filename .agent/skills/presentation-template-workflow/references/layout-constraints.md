# Layout Constraints (1280x720)

Use these constraints when fixing clipping or creating a new layout in `servers/nextjs/presentation-templates/*`.

## Container Baseline

- Slide root is typically `max-w-[1280px] aspect-video max-h-[720px]`.
- Treat `720px` height as hard budget for all vertical rhythm.

## Safe Defaults

- Outer content padding:
  - top/bottom: `pt-10..pt-14`, `pb-10..pb-12`
  - left/right: `px-16..px-[72px]`
- Main title:
  - `text-[46px]..text-[54px]`
  - `leading-[52px]..leading-[60px]`
- Section subtitle:
  - `text-[24px]..text-[32px]`
  - `leading-[29px]..leading-[38px]`
- Body/list text:
  - `text-[22px]..text-[28px]`
  - `leading-[29px]..leading-[34px]`

## High-Risk Patterns

- `overflow-hidden` on text elements with variable content.
- Tall fixed blocks (`h-[500px]+`) combined with large headings.
- Large gaps (`mt-12+`, `space-y-8+`) in dense compositions.
- Multi-line uppercase headers with aggressive font size.

## Anti-Clipping Fix Order

1. Remove text-level `overflow-hidden`.
2. Reduce heading size and leading.
3. Reduce top margins and section spacing.
4. Reduce fixed card/image heights.
5. Only then adjust outer paddings.

## Template Discovery Rules

- Template folder is included by `/api/templates` only if it has at least one `.tsx` layout file.
- Keep `settings.json` valid and present.
- Keep `default: true` for exactly one desired default template unless deliberate multi-default behavior is needed.
