# Product

## Register

product

## Users

Venue operators and their front-desk staff in francophone West Africa: owners, admins, receptionists, and trainers running gyms, yoga and dance studios, spas, tennis clubs, CrossFit boxes, and pools. One organization can run several venues.

They are not IT people. They reach for this mid-task: standing at a counter on a phone or tablet, a member in front of them, checking someone in or enrolling a walk-in while the room fills up. A smaller share (owners, admins) sit down at a laptop to review attendance, adjust next week's timetable, or invite a trainer. The market is mobile-heavy, French-first, and money moves through Wave, Orange Money, and cash in FCFA.

The job to be done: know who is here, who is expected, and who owes what, and act on it in a few taps without second-guessing.

## Product Purpose

IziWellPass is the management system a wellness venue runs on day to day: members and subscriptions, class and session scheduling, bookings, door check-ins, and staff access. It replaces the notebook, the WhatsApp group, and the spreadsheet with one calm operating surface.

Success is invisible: a receptionist checks in a full 06:30 class without thinking about the tool, an owner spots that occupancy dipped on Tuesdays and moves a class, a new trainer gets exactly the access their job needs and nothing more. The product wins when staff stop noticing it and just get through the day.

The API is the contract. Every screen maps to something the system can actually do; the design never promises data or actions the backend cannot back up.

## Brand Personality

**Calm, warm, precise.**

- **Calm:** quiet and factual. Status is communicated with color and a badge, never an exclamation. The interface recedes so the operator's work is the loudest thing on screen. Warnings are matter-of-fact ("3 paiements en attente"), not alarms.
- **Warm:** approachable for people who are not technical. Plain, human French. Obvious affordances. Forgiving flows that confirm before anything destructive and never leave a dead end.
- **Precise:** high craft, dependable. This handles people's memberships and money, so it should feel considered and trustworthy, closer to a serious professional tool than a consumer app.

Voice: French-first, sentence case, short and operational. Nouns for labels (Abonnement, Salle, Moyen de paiement), imperative verbs for buttons (Ajouter, Valider, Modifier). No hype, no marketing gloss, no emoji. Meaning is carried by Lucide icons and badge color.

## Anti-references

The design must not read as any of these:

- **Generic SaaS dashboard:** cream-and-blurple palettes, hero-metric cards, endless identical icon+heading grids, gradient accents. The default "AI made this" look.
- **Loud consumer fitness app:** neon gradients, aggressive motion, gamified badges, hype copy. Too shouty for a tool used all day at a desk.
- **Dense enterprise admin:** cramped tables, tiny type, everything crammed on screen at once. Unusable on a phone at the counter.
- **Playful / gamified:** cartoon illustration, mascots, confetti, emoji. Undercuts the operational trust the tool has to earn.

## Design Principles

1. **Front-desk first.** Design for someone standing, on a small screen, mid-conversation. Large tap targets, few steps, one clear primary action per screen. The rapid-repeat flows (check-in, enroll a walk-in) are the ones to make effortless.
2. **Quiet by default.** The interface is the frame, not the picture. Restraint over decoration. Depth from a hairline border and a soft shadow, not gradients or glass. If an element is not helping the operator act, it should be quieter or gone.
3. **Trust through competence.** Because it touches money and memberships, it must feel dependable and precise. No hype, no gimmicks. Calm confidence is the brand's edge over the WhatsApp-and-notebook status quo.
4. **Show the truth, gently.** Empty, loading, and error states are designed moments, not afterthoughts. Surface real state honestly (a designed empty state with a clear next step, an error with a support reference) rather than faking polish over missing data. Flag known gaps as disabled affordances instead of hiding them.
5. **Speak the operator's language.** Plain French, the vocabulary of the desk, the region's payment methods and currency. Never make a non-technical user decode jargon or an untranslated string.

## Accessibility & Inclusion

Target **WCAG AA**, enforced as a baseline rather than an aspiration:

- AA contrast for text and meaningful UI, in both light and dark themes.
- Every interactive element keyboard operable, with a visible focus ring.
- Status never conveyed by color alone; badges always carry a text label.
- Touch targets sized for a phone used one-handed at the counter (front-desk screens especially).
- `prefers-reduced-motion` respected; motion is functional, never decorative.
- Labels on every input, accessible names on icon-only controls, dialogs and drawers properly titled.

Inclusion note: users span a range of digital literacy and device quality on variable mobile connections. Favor robust, obvious flows and fast, lightweight screens over dense or clever ones.
