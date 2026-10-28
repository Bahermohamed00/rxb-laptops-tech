# RXB Admin Preview

React + TypeScript + Vite admin interface. Authentication, authorization, business records, and backend connections are not implemented. The motion system never implies a live connection or invents business metrics.

From the repository root:

```sh
npm run dev:admin
npm run build:admin
npm run preview:admin
```

## Visual foundation

Navy surfaces, electric blue accents, Manrope headings, and DM Sans interface text remain intact. Color, typography, spacing, responsive layout, and surface tokens live in `src/styles.css`. The existing isometric SVG remains the dashboard's focal point.

The Admin supports light and dark themes. It follows the device preference on first visit, then persists a user selection in the `rxb-theme` cookie and local storage. The preference is read before styles load to reduce flashes and is shared with the Storefront when both apps use the same hostname.

## Phase 2 motion architecture

Runtime dependencies are `gsap` 3.15.0 and `@gsap/react` 2.1.2. Registration happens once in `src/motion/gsap.ts`. All animation selectors are scoped to component refs. `useGSAP`, `gsap.matchMedia`, and context-bound event handlers own animation cleanup, including React Strict Mode remounts and live reduced-motion changes.

- `src/motion/useEntrance.ts`: one coordinated entrance, approximately 1.7 seconds. Sidebar and navigation stagger precede header, heading, hero lines, copy, CTA, SVG assembly, connection panel, and cards. Returning views do not replay the shell. Keyboard focus on controls completes the reveal immediately. An SVG setup failure reverts the entrance to visible content.
- `src/components/WorkspaceSchematic.tsx`: existing geometry grouped into layers, core, connections, and markers. Stroke-dash drawing and a finite signal pass use the existing connection paths. No infinite animation loops or SVG plugins.
- `src/App.tsx`: cancellable 160ms outgoing transition, then keyed incoming content. Rapid changes cancel obsolete completion callbacks. A 400ms navigation fallback prevents stalled animation frames from blocking a destination. Outgoing content is inert; focus moves to the new heading.
- `src/routes.ts` and `src/motion/useHashView.ts`: canonical hashes `#/dashboard`, `#/products`, `#/inventory`, `#/orders`, `#/customers`, `#/reports`, and `#/sign-in`. Back/Forward and refresh resolve the URL. Unknown hashes normalize to Dashboard. The skip link focuses content without overwriting the route.
- `src/components/AdminLayout.tsx`: a moving active-navigation outline, resize-aware positioning, and a mobile disclosure button with `aria-expanded`, `aria-controls`, and inert collapsed navigation. Cleanup disconnects resize observers and restores desktop navigation.
- `src/motion/useInteractions.ts`: fine-pointer hover elevation, icon movement, press/cancel feedback, and pointer-following card lighting. Pointer movement is frame-coalesced and reuses GSAP quick setters; bounds are measured on entry and invalidated on scroll/resize. Event listeners, pending frames, and media contexts are disposed on view changes.
- `src/styles.css`: focus-visible accent strokes and restrained status-border feedback. Reduced motion disables CSS transitions as well as GSAP motion.

Content is visible in baseline CSS; only decorative overlays start hidden. No data loading or authentication behavior was added.

## Responsive behavior

The Phase 1 breakpoints remain: asymmetric desktop overview, three card columns below 1250px, stacked connection information below 1000px, top navigation below 760px, and two card columns below 480px. Mobile navigation can now be expanded/collapsed. Pointer lighting is limited to fine pointers with hover support. Reduced-motion preferences are observed at runtime, not just on initial load.

## Verification

- Admin TypeScript and Vite production build passed.
- DOM integration checks passed for every section, disabled sign-in without credential fields, active navigation, focus placement, hashes, Back/Forward, remount/refresh semantics, rapid navigation, completed-content visibility, pointer handlers, mobile disclosure semantics, invalid hashes, skip links, and live reduced-motion changes.
- The DOM harness mounts React Strict Mode and confirms no remaining GSAP animations after unmount and no captured React/GSAP warnings.
- DOM tests mock viewport media queries and SVG geometry. They do **not** validate pixel layout, physical keyboard input, SVG appearance, browser rendering performance, or device smoothness. Real-browser visual/responsive testing remains outstanding because browser/native access was unavailable.
- No lint command or persistent test-framework dependency was added.

Reproduce the DOM checks with an isolated test utility (not a workspace dependency):

```sh
npm install --prefix apps/admin/.motion-check --no-save --no-package-lock --no-audit --no-fund jsdom@29.1.1
node apps/admin/scripts/motion-check.mjs
```

The temporary `.motion-check` directory can be removed after testing. The production workspace needs only its normal npm install.

## Phase 3: Bento and interactive depth

The operational row is now `BentoWorkspaces`: Products anchors a tall desktop panel, with Inventory, Orders, Customers, and Reports arranged alongside it. Each button has its own decorative SVG motif (laptop, storage boxes, document, people, layered report sheets), an explicit accessible navigation name, and an unavailable-data label. No diagrams represent live records or metrics.

The system overview states **Backend: Not implemented**, **Authentication: Not configured**, and **Business data: Unavailable**, explicitly labeled as known development states rather than a health check.

`src/motion/heroParallax.ts` extends the existing interaction context. Outer SVG wrappers handle pointer depth while the original inner groups retain assembly animation ownership. Fine-pointer motion is limited to 2–2.5 degrees of perspective and small layer offsets, with half strength on narrower hero panels. Bounds are cached on entry, pointer events coalesced into animation frames, and scroll/resize/cancel restore neutral positioning. Touch/coarse-pointer and reduced-motion users receive the static illustration. No animation loops or new runtime dependencies were added.

The existing entrance timeline now staggers Bento panels in document order, with shorter travel on mobile. Existing lighting, arrow, press, and focus treatment is retained; illustrations lift subtly on hover.

### Intended responsive composition

| Viewport | Composition |
| --- | --- |
| 1920 / 1440 | Products spans two rows, with four companion panels in two columns; hero and system overview remain asymmetric |
| 1024 / 768 | Products spans both columns above two pairs of companion panels; system overview sits below hero |
| 390 | Single-column panels with full descriptions and distinct illustrations; stacked hero and status module |

Phase 3 TypeScript/Vite build and the extended DOM checks passed. Added assertions cover all Bento destinations, truthful system labels, pointer-driven hero depth, neutral reset, and reduced-motion transform cleanup. Existing routing/history/focus/Strict Mode checks also pass without captured React/GSAP warnings. Responsive rules were reviewed in source; real-browser screenshots, overflow measurements, physical keyboard checks, and performance review at these widths remain unverified because no browser/native connection was available.
