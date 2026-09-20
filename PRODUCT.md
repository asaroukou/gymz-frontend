# Product

## Register

product

## Users

Two audiences share one brand, mirroring the public site's approved duality:

**Venue operators and their front-desk staff** in francophone West Africa: owners, admins, receptionists, and trainers running gyms, yoga and dance studios, spas, tennis clubs, CrossFit boxes, and pools. One organization can run several venues. They are not IT people. They reach for this mid-task: standing at a counter on a phone or tablet, a member in front of them, checking someone in or enrolling a walk-in while the room fills up. A smaller share (owners, admins) sit down at a laptop to review attendance, adjust next week's timetable, or invite a trainer.

**Members (adhérents)**: the people who train there. Phone in hand at the door needing their entry QR, or on the couch checking their plan and next session. Their app is a membership card, not a fitness tracker.

The market is mobile-heavy, French-first, and money moves through Wave, Orange Money, and cash in FCFA.

The job to be done: know who is here, who is expected, and who owes what, and act on it in a few taps without second-guessing.

## Product Purpose

IziWellPass is the management system a wellness venue runs on day to day: members and subscriptions, class and session scheduling, bookings, door check-ins, and staff access, plus the member's own card in their pocket. It replaces the notebook, the WhatsApp group, and the spreadsheet with one calm operating surface.

Success is invisible: a receptionist checks in a full 06:30 class without thinking about the tool, an owner spots that occupancy dipped on Tuesdays and moves a class, a member flashes their QR and is through the door before the conversation pauses. The product wins when people stop noticing it and just get through the day.

The API is the contract. Every screen maps to something the system can actually do; the design never promises data or actions the backend cannot back up.

## Brand Personality

**Calme, honnête, précis.** Calm, honest, precise: the voice of « Le comptoir clair ».

- **Calm:** a white page, a grey side column, one light heading and one central action. Nothing competes for attention; content sits in pale tinted tiles or between hairlines. Approachable for people who are not technical. Plain, human French. Obvious affordances. Forgiving flows that confirm before anything destructive and never leave a dead end.
- **Honest (flat):** no elevation at all. Depth comes from three tones, space, and a hairline between rows, never from shadows, borders around groups, glass, or gradients (a recorded product decision, with one optional soft wash behind a hub heading as the sole exception). Status is stated as fact with a labeled badge, never an exclamation. Real state is surfaced honestly: designed empty states, calm errors with a support reference, known gaps shown as disabled affordances rather than hidden.
- **Precise:** this handles people's memberships and money. High craft, dependable, closer to a serious professional tool than a consumer app. Figures align (tabular numerals), timetables read at a glance, one obvious primary action per screen.

Voice: French-first, sentence case everywhere: headings, buttons, labels, badges, navigation. No uppercase anywhere. Nouns for labels (Abonnement, Salle, Moyen de paiement), imperative verbs for buttons (Ajouter, Valider, Modifier). No hype, no marketing gloss, no emoji. Meaning is carried by words first, Lucide icons and badge color second.

## Anti-references

The design must not read as any of these:

- **Generic SaaS dashboard:** bordered metric cards, endless identical icon+heading grids, coloured accent buttons, gradient controls. Cards and gradients are prohibited; the stat strip is numbers over labels with a hairline between them, never a grid of boxes.
- **Loud consumer fitness app:** neon, aggressive motion, gamified badges, hype copy. Too shouty for a tool used all day at a desk.
- **Dense enterprise admin:** cramped tables, tiny type, everything crammed on screen at once. Unusable on a phone at the counter.
- **Playful / gamified:** cartoon illustration, mascots, confetti, emoji. Undercuts the operational trust the tool has to earn.
- **Sterile enterprise minimalism:** white used as absence rather than as a stage, grey text everywhere, no focal point, no warmth in the content. The counter is white so that the one thing on it stands out; the tinted tiles and the human names on the feed keep it from feeling empty.

## Design Principles

1. **Front-desk first.** Design for someone standing, on a small screen, mid-conversation. Touch targets of at least 2.75rem, few steps, one clear primary action per screen. The rapid-repeat flows (check-in, enroll a walk-in, flash the QR) are the ones to make effortless.
2. **Flat, with no elevation.** Depth comes from tone (white page, grey side, grey pill), from space, and from a hairline between rows. No shadows, no borders around groups, no glass, no gradients beyond the optional wash behind a hub heading. Nothing is wrapped in a card.
3. **One focal point, light type.** Hub screens open with one large light heading and the command bar, centred, with nothing else competing. Working screens use a light 32 px title and hairline tables. Emphasis comes from size and space, never from bold: headings stay at 400 or 500, active states sit on a grey pill.
4. **Show the truth, gently.** Empty, loading, and error states are designed moments, not afterthoughts. Surface real state honestly rather than faking polish over missing data.
5. **Speak the operator's language.** Plain French, the vocabulary of the desk, the region's payment methods and currency. Never make a non-technical user decode jargon or an untranslated string.

## Accessibility & Inclusion

Target **WCAG AA**, enforced as a baseline rather than an aspiration:

- AA contrast for text and meaningful UI, measured on the surface the text actually sits on. Secondary text is dark grey (`#5f6368`) on white and the side column, and one step darker (`#4d5156`) on tinted tiles; both hold AA and APCA Lc 75.
- Every interactive element keyboard operable; focus is a visible 3px ink outline offset 4px from the element.
- Status never conveyed by color alone; badges always carry a text label.
- Touch targets at least 2.75rem on every interactive control (front-desk screens especially).
- `prefers-reduced-motion` respected; motion is functional, never decorative.
- Labels on every input, accessible names on icon-only controls, dialogs and drawers properly titled.

Inclusion note: users span a range of digital literacy and device quality on variable mobile connections. Favor robust, obvious flows and fast, lightweight screens over dense or clever ones.
