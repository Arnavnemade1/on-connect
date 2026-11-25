# Onconnect design direction

Standard: AVStack's taste rules (clean, modern, premium, professionally directed). Reference points: Linear for precision, an Apple product launch for restraint, and the GPT-6 Astra launch page for the landing page and the overall mood: near-black, light-weight oversized type, hairline rules, pill buttons, one quiet moving element.
The interface is for children with cancer and their families, so it must also read as calm, plain and trustworthy. Quiet is the premium here.

## Idea
A calm instrument, dark first. Near-black surfaces, one pale-blue accent, one typeface (Geist), hairline rules instead of boxes. The answer is the only thing that leads on the chat screen.

## Signature element
The logo mark: a circle split into a solid and a faded half, "two readers, one explanation". It is the only two-tone shape in the product. Nothing else is decorative.

## Tokens

**Type.** One family, Geist. Five sizes in the app plus one display size used only on the landing page hero. Headings are light (400-500) and tightly tracked.

| Token | Size | Weight | Use |
|---|---|---|---|
| `--t1` | 12px | 500 | labels, captions, metadata |
| `--t2` | 14px | 500 | controls, navigation, tables, secondary text |
| `--t3` | 16px | 400 | body and chat answers (line height 1.55, measure ≤ 68ch) |
| `--t4` | 20px | 600 | section headings |
| `--t5` | 40px | 500 | page titles and the chat greeting |
| `--t6` | 56-160px (fluid) | 400 | landing hero only |

Numbers that are compared use tabular figures.

**Space.** 4px base: 4, 8, 12, 16, 24, 32, 48. No one-off values.

**Colour.** Neutrals carry the interface. One accent (blue) marks the active item, links, primary buttons and focus. Green, amber and red appear only for state, never alone: they always come with a label or icon.

| Role | Light | Dark |
|---|---|---|
| background | `#FFFFFF` | `#050506` |
| surface | `#FFFFFF` | `#0B0B0D` |
| hover / fill | `#F4F4F5` | `#131316` |
| line | `#E8E8EA` | `#1F1F23` |
| strong line | `#D6D6DA` | `#2E2E33` |
| text | `#0A0A0B` | `#F5F5F7` |
| muted text | `#5F6168` | `#9A9AA3` |
| accent | `#2B5DA8` | `#93B4FF` |

No gradients, blur or glow. The one moving element is the landing star field, which links stars near the pointer into a constellation ("connect"). It respects reduced motion and pauses off screen.

**Shape.** Radii: 8px for small controls, 12px for surfaces (composer, popovers, the demo frame), full for pills, buttons and circles. Content sections are not boxed: they sit under a hairline rule. One shadow, used only for things that float (composer, palette, popover, toast).

**Motion.** 150ms ease-out for state changes. Nothing bounces, nothing loops except the single streaming caret. The one expressive moment is the answer streaming in.

## Layout rules
- One thing leads per screen. Chat: the answer. Home: the question box. Pages: the title.
- Related things are closer than unrelated things. Empty space is deliberate: no padding screens with cards.
- Lists and dividers over boxes. A card is for a self-contained unit, not for every group.
- Left-aligned. The only centred screens are the empty chat and the closing call to action, each with one element and one action.
- Primary buttons are solid pills (white on dark, black on light).

## Content rules
- Real content only. No stat tile shows a number the product does not produce, and nothing is shown at all before there is data.
- Labels say what the thing is. No marketing voice in the interface.
- Icons come from one set (Lucide, 16px or 18px, 1.75 stroke). No emoji.

## Checks (AVStack taste checklist, summarised)
Typography 1-5, space and layout 6-10, colour 11-14, components 15-18, content 19-20, motion 21-23. Any one of these is an automatic fail on a screen: purple-blue gradient hero, glass cards, a grid of identical icon cards, everything centred, invented stat tiles, a sparkle icon for AI, glowing borders, competing accents, dim grey text on dark.
