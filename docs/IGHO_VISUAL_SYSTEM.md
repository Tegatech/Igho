# Igho Visual System

Status: Locked baseline for V1 visual implementation.

## Brand primitives

- Primary navy: `#08182B`
- Paper: `#F5F2EA`
- Gold: `#E5A400`
- Product UI font: Inter only
- Supported UI weights: 400, 500, 600, 700
- Product mark: exact 3×3 Igho dot-grid asset with gold centre
- Wordmark: use the approved `igho-wordmark.png` asset; never recreate the wordmark with live text
- Compact contexts use the symbol only
- Dark surfaces use the reversed symbol and approved wordmark treatment

## Typography

The shared scale is defined in `client/styles/tokens.css`.

- Page title: 24px / 700
- Section heading: 14px / 600
- Body: 13px / 400
- Navigation and controls: 12px / 500–600
- Table body: 12px / 400–500
- Table headers: 10px / 600–700
- Helper and metadata: 11px / 400–500
- Financial values: 18–30px / 700

Avoid text below 10px.

## Components

Use the shared token system for:
- buttons
- inputs and selects
- tabs
- status labels
- surfaces
- tables
- drawers
- modals
- mobile records

Do not introduce local type scales, new weight values, new radius scales, or decorative shadows without an explicit design-system change.

## Product language

Normal user-facing UI must describe Igho concepts, not implementation details.

Do not expose terms such as:
- Neon Auth
- Catalyst API
- Development
- internal deployment/runtime terminology

Environment or implementation details belong in diagnostics only.

## Visual direction

Igho should remain quiet, financial, operational and trustworthy.

Avoid:
- gradients
- glass effects
- generic AI-dashboard styling
- excessive cards
- decorative UI that does not communicate state or hierarchy

## Responsive rule

Desktop, tablet and mobile use the same brand primitives and typography tokens. Responsive styles may change layout and spacing, but must not create a separate visual language.
