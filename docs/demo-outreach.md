# Signal demo and outreach package

Independent Product Engineering proof of work by Akshay Bhushan, final-year DTU engineer. Inspired by creator-led distribution problems; not commissioned by or branded as Aydus. All example names, posts, comments and metrics are synthetic.

## Two-minute demo

**0:00 — The question.** “A creator can get attention without generating buying conversations. Signal lets us inspect the difference, without pretending a comment equals a sale.” Show the terracotta overview and synthetic banner.

**0:20 — Compare.** Show post views next to buying-intent share. Read the denominator aloud: buying-intent comments divided by imported comments. Point out low coverage and sample bias. The invented example deliberately includes a larger-view post with weaker intent.

**0:40 — Inspect.** Open comment evidence and select Buying intent. Inspect “Where can I buy this?” Show matched text, rule and explanation. Switch to Negative and inspect “I don’t want to buy this” to demonstrate why negation matters.

**1:00 — Exercise judgment.** Filter Ambiguous and inspect “Maybe I will buy this next month.” Save a reason with a human decision, or confirm Ambiguous. Show that the app retains the automatic label separately and recalculates effective metrics.

**1:20 — Import.** Download the template. Attempt a CSV with missing columns; show the helpful error and intact dataset. Load the synthetic example CSV again; its marker preserves the synthetic label. Explain one row per comment and identical post metrics across rows.

**1:40 — Leave with evidence.** Download post findings and comment evidence. Open a file to show source text, matched phrases, rule version, synthetic status and human review. Close with the limitations: English phrase rules, partial samples, session-only state, no conversion measurement.

## Draft message to Satvik

Hi Satvik — I’m Akshay, a final-year DTU engineer exploring Product Engineering roles. I built Signal, an independent prototype around a creator-led distribution question: which posts generate buying conversations, beyond getting views?

It works end to end: import post metrics and comments, inspect deterministic intent rules, review ambiguous or negated language, and export the findings with the underlying evidence. I paid particular attention to denominators and sample coverage so the product doesn’t imply that observed intent is a conversion.

The demo uses clearly marked synthetic data, and the base app runs without credentials. I’d be glad to walk you through the product and engineering decisions if this is relevant to what you’re building.

Akshay

Add a verified repository or demo link before sending. No destination address or public URL is invented here. This message has not been sent.

## Short repository introduction

Signal is a local-first creator intent workbench with CSV imports, transparent English phrase rules, human evidence review and exportable findings. Built as an independent Product Engineering proof of work, using a clearly marked synthetic demo. Observed comment intent is never presented as actual conversions.

## Talking points

- Product judgment: compare attention with observed intent while making the sample denominator and coverage visible.
- Reliability: atomic imports reject conflicting metrics and duplicate IDs; views count once per post.
- Explainability: matched text, named rules, original results and reviewed decisions remain inspectable.
- Safety: comments remain local; credential-free baseline; formula-safe exports; no automatic purchase action.
- Tradeoff: session memory keeps the prototype focused and private, but export is required before refresh. A production version needs durable storage, stronger auditability and evaluated language support.
