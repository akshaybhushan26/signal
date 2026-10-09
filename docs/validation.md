# Validation

Validation performed on 9 October 2026. This document records executable checks, not a claim of production readiness.

- Engine suite (11 passing tests): CSV quoting/newlines/BOM; repeated-post aggregation; missing columns and empty input; conflicting metrics and duplicate IDs; malformed CSV and missing values; imported/report-count mismatch; purchase, consideration, weak desire, negative, conditional and mixed intent; human override provenance; zero denominators; spreadsheet formula escaping.
- Browser suite (3 passing flow scenarios): clearly marked synthetic initial state; category/search filters; evidence inspection; mandatory review reason; saved review; filtered download; template download; rejected import; successful import replacing prior state; full export; mobile width; zero-comment empty states; Escape and focus restoration.
- Automated accessibility: axe WCAG 2 A/AA and WCAG 2.1 AA checks pass on overview, evidence, import dialog and mobile methodology. These checks supplement the keyboard/focus tests; they do not certify full accessibility.
- Production validation: strict TypeScript check and optimized static build.
- Visual validation: desktop and mobile screenshots of actual running UI. No screenshot represents a real creator campaign.

Reproduce with `npm test`, `npm run build`, and `npm run test:e2e` after `npx playwright install chromium`. Tests run Chromium. Safari/Firefox, screen-reader usability, multilingual classification quality and large-scale performance are not certified by these checks.

Final result: **11 engine tests passed, 3 browser flow scenarios passed, 1 automated accessibility scenario passed, strict TypeScript and production build passed.** Desktop 1440px and mobile 390px screenshots showed no page overflow; no browser runtime errors were observed. All screenshots use the synthetic example.
