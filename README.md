# Signal

**From creator attention to inspectable buying intent.** A working, local-first Product Engineering proof of work by Akshay Bhushan, a final-year DTU engineer.

Signal imports post metrics and individual comments, applies transparent English phrase rules, lets a human inspect and revise the labels, and exports the evidence with explicit denominators. It is an independent reusable prototype inspired by creator-led distribution problems. It is not affiliated with Aydus and is not an Aydus-branded assignment.

![Signal overview](docs/overview.png)

## Run locally

Node 22.12+ (Node 22 LTS recommended) and npm are required. No account, API key or environment variables are needed.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. The initial screen contains **synthetic** data: four invented creators, four invented posts and 48 invented comments. No real Aydus metrics, customers or conversion outcomes are represented.

```sh
npm test                 # parsing, rules, aggregation, review and export tests
npm run build            # strict TypeScript check and production bundle
npx playwright install chromium
npm run test:e2e         # desktop/mobile import, evidence, review and export flows
npm run preview          # preview the built app on port 4173
```

Vite's runner configuration loader avoids configuration-bundling startup issues in restricted desktop environments. The committed lockfile makes installs reproducible.

## Try the product

1. Compare reported post views with buying-intent share and imported comment coverage.
2. Open **Comment evidence**. Filter a post or category; search text; show unreviewed ambiguous comments.
3. Inspect a comment. Read the matched phrases, rule ID and automatic explanation. Save a decision with a review reason, or restore the automatic result.
4. Export full post findings, full comment evidence, or filtered comment evidence. Automatic and reviewed labels remain separate in the evidence file.
5. Download a blank CSV template or the marked synthetic example. Import your own CSV; invalid files leave the current dataset intact. A successful import replaces the dataset and clears prior reviews.

Data and reviews live in browser memory. Export before refreshing or closing. Nothing is sent to a server; there is no persistence, shared account or backend.

## CSV contract

CSV is UTF-8 with a header; quoted commas, quoted newlines and a BOM are supported. One row per comment; repeat the same post fields on each row. For a post with no imported comments, leave both comment fields blank.

| Column                    | Requirement                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `post_id`                 | Non-empty post identifier; repeated rows must agree on all post details               |
| `creator`                 | Non-empty creator display name                                                        |
| `post_title`              | Non-empty post title                                                                  |
| `views`                   | Non-negative safe whole number                                                        |
| `likes`                   | Non-negative whole number, no greater than views                                      |
| `reported_comments`       | Non-negative whole number, no less than the number of imported comments for that post |
| `comment_id`              | Globally unique comment identifier, or blank with blank text                          |
| `comment_text`            | Non-empty text when an ID exists; up to 10,000 characters                             |
| `dataset_type` (optional) | `synthetic` or `user-supplied`; defaults to user-supplied. Do not mix types in a file |

Maximum 5 MB and 10,000 data rows. Unknown additional columns are ignored. Missing headers, malformed rows, invalid metrics, conflicting post metadata, duplicate comment IDs and unpaired comment fields produce actionable errors. Files are imported atomically. A file name is not proof of provenance; mark invented datasets as synthetic. The provided synthetic CSV includes this marker so renaming it does not remove the label.

Examples are available in `public/signal-template.csv` and `public/signal-synthetic-example.csv`, as well as through the app's import dialog.

## Explainable rules: `rules-1.0`

The classifier is deterministic. Matching is case insensitive; curly apostrophes are normalized. Each result exposes its rule ID, matched language and reason.

1. **Negative:** supported negation near buy/order/purchase/want/need/send/share, or phrases such as “not interested”, “too expensive”, “not worth”, “scam”. Negated spans are masked before checking positive matches, so “I don't want to buy this” is negative. Separate positive and negative matches become **Ambiguous**.
2. **Buying intent:** supported explicit purchase actions and routes, e.g. “where can I buy”, “I will order”, “send me the link”, “ready to buy”. Conditional, uncertain or humorous qualifiers (e.g. “if”, “maybe”, “lol”) downgrade a purchase match to **Ambiguous**.
3. **Consideration:** supported questions or terms for price, shipping, sizes, availability, fit and warranty without a supported explicit purchase action.
4. **Ambiguous:** weak desire, uncertain language, or a bare “link”.
5. **Other:** no supported match.

These are heuristics, not a trained or validated predictive model. “Send me the link” may reflect curiosity; “price” may be a complaint; unseen purchase language may go to Other. Sarcasm, spam, multilingual text, identity and context are not reliably understood. No confidence calibration, precision/recall or actual sales uplift is claimed. Every category can be reviewed. A review note is required and exports retain automatic category, effective category, original comment, matched evidence and timestamp. This is session-level traceability, not a durable production audit log.

## Denominators and product judgment

- **Post views:** sum of input views, counted once per post. Views may repeat and overlap; this is not unique reach.
- **Observed buying intent:** count of imported comments whose effective label is Buying intent. Comments are not deduplicated people or customers.
- **Intent share:** buying-intent comments / all imported comments for the same post. Human decisions are included. No imported comments means undefined (`—` in the UI, blank in CSV), not 0%.
- **Coverage:** imported comments / reported comments. A partial sample can be biased. A zero denominator is undefined.
- **Ambiguous comments:** all effective Ambiguous labels; the optional evidence filter further limits to unreviewed ones.

The comparison deliberately shows view volume and intent share with separate denominators and scales. It does not multiply views by a comment percentage or estimate conversions. The “closer look” card picks the post with the highest observed share among posts with imported comments; it is a prompt to inspect a sample, not an investment or performance recommendation. Small samples and ties limit the comparison.

## Architecture

React + TypeScript + Vite; Papa Parse for CSV; Lucide for icons; Playwright for user flows. There is no runtime service dependency. Fonts are bundled locally. UI modules consume pure typed functions rather than embedding classification rules in presentation code.

```text
src/lib/engine.ts   CSV validation, classification, aggregation and safe exports
src/lib/demo.ts     Marked, reproducible synthetic dataset and template
src/App.tsx         Overview, evidence, methodology, import/export and review flows
src/styles.css     Responsive theme, interaction states and focus visibility
tests/            Engine tests and browser scenarios
docs/             Demo/outreach copy, screenshots and validation notes
```

State is bounded to a single dataset, review map and UI filters. Filtering does not silently change full-dataset exports; the evidence screen explicitly offers a filtered export. Imports and resets clear reviews to prevent a decision being attached to a different comment with a reused ID. Pagination keeps evidence rendering manageable. Post fields are normalized and validated once; views are never summed per comment row.

React renders source strings as text rather than HTML. CSV exports prefix spreadsheet-formula-like strings (including leading whitespace) with an apostrophe. That escaping may add an apostrophe on re-import; exports are findings, not a round-trip backup. File/row/text limits reduce accidental resource exhaustion. The 10,000-row limit is a prototype ceiling, not a performance SLA; parsing/classification run on the main thread.

## Optional LLM extension design (not implemented)

The current app never calls an AI endpoint. If added later, the extension should be explicitly opt-in per selected dataset/comment subset, with a preview of exactly which text leaves the browser, provider/model disclosure and an estimated cost. Use a server-side key, never a client environment variable. Redact personal data, obtain permission to process it, limit request size/rate and validate a strict response schema. Keep comment text untrusted: it cannot change instructions, invoke tools or trigger purchases.

Keep rule-based results as the baseline. Store model suggestions separately with provider/model/version, source quotes and evaluation evidence; require human acceptance to change effective labels. Evaluate against an independently labeled multilingual and negation-rich dataset before adding any quality claim. The extension should fail back to the credential-free rule workflow.

## Deploy when authorized

`npm run build` produces `dist/`, a static site suitable for static hosting. Configure a host with install command `npm ci`, build command `npm run build`, output directory `dist` and Node 22.12+. No secrets or server functions are needed. Preview locally first. For a repository subpath, set Vite's `base` accordingly before building. See the [official Vite deployment guide](https://vite.dev/guide/static-deploy.html).

No deployment, repository push or outreach was performed as part of this build. Public release requires reviewing imported comment privacy and the synthetic-data labeling. The MVP omits authentication, persistence, analytics, integrations, automated scraping and conversion attribution intentionally.

## Demo and outreach

See [the two-minute demo and draft message to Satvik](docs/demo-outreach.md) and [validation evidence](docs/validation.md). The message is a draft and has not been sent. Repository description: **Local-first creator intent workbench: CSV imports, explainable rules, human evidence review and transparent exports.**
