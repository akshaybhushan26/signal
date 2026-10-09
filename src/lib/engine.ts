import Papa from "papaparse";
export type Category =
  "Buying intent" | "Consideration" | "Ambiguous" | "Negative" | "Other";
export const categories: Category[] = [
  "Buying intent",
  "Consideration",
  "Ambiguous",
  "Negative",
  "Other",
];
export type Post = {
  id: string;
  creator: string;
  title: string;
  views: number;
  likes: number;
  reportedComments: number;
};
export type Comment = { id: string; postId: string; text: string };
export type Dataset = {
  posts: Post[];
  comments: Comment[];
  synthetic: boolean;
  name: string;
};
export type Result = {
  category: Category;
  evidence: string[];
  reason: string;
  rule: string;
};
export type Review = { category: Category; note: string; at: string };
export type Reviews = Record<string, Review>;
export function reviewFor(reviews: Reviews, id: string): Review | undefined {
  return Object.hasOwn(reviews, id) ? reviews[id] : undefined;
}
export const VERSION = "rules-1.0";
export const headers = [
  "post_id",
  "creator",
  "post_title",
  "views",
  "likes",
  "reported_comments",
  "comment_id",
  "comment_text",
];
export function parseCSV(text: string, name = "Imported CSV"): Dataset {
  if (text.length > 5_000_000)
    throw new Error(
      "File exceeds the 5 MB limit. Split your export into smaller files.",
    );
  const parsed = Papa.parse<Record<string, string>>(
    text.replace(/^\uFEFF/, ""),
    {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
    },
  );
  const missing = headers.filter((h) => !parsed.meta.fields?.includes(h));
  if (missing.length)
    throw new Error(
      `Missing columns: ${missing.join(", ")}. Download the template for the expected format.`,
    );
  if (parsed.errors.length)
    throw new Error(
      `CSV row ${parsed.errors[0].row === undefined ? "?" : parsed.errors[0].row + 2}: ${parsed.errors[0].message}`,
    );
  if (!parsed.data.length)
    throw new Error("No data rows found. Add at least one post.");
  if (parsed.data.length > 10000)
    throw new Error("Maximum 10,000 rows per import.");
  const posts = new Map<string, Post>();
  const comments: Comment[] = [];
  const ids = new Set<string>();
  parsed.data.forEach((row, index) => {
    const r = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k, (v ?? "").trim()]),
    );
    const fail = (m: string): never => {
      throw new Error(`Row ${index + 2}: ${m}`);
    };
    for (const h of ["post_id", "creator", "post_title"])
      if (!r[h]) fail(`${h} is required.`);
    const number = (h: string) => {
      if (!/^\d+$/.test(r[h]))
        fail(`${h} must be a non-negative whole number.`);
      const n = Number(r[h]);
      if (!Number.isSafeInteger(n)) fail(`${h} is too large.`);
      return n;
    };
    const post: Post = {
      id: r.post_id,
      creator: r.creator,
      title: r.post_title,
      views: number("views"),
      likes: number("likes"),
      reportedComments: number("reported_comments"),
    };
    if (post.likes > post.views) fail("likes cannot exceed views.");
    const previous = posts.get(post.id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(post))
      fail(
        `Metrics or details conflict for post ${post.id}. Repeat identical post fields on each comment row.`,
      );
    posts.set(post.id, post);
    if (Boolean(r.comment_id) !== Boolean(r.comment_text))
      fail(
        "comment_id and comment_text must both be filled, or both blank for a post with no imported comments.",
      );
    if (r.comment_id) {
      if (ids.has(r.comment_id))
        fail(
          `Duplicate comment_id ${r.comment_id}. IDs must be unique across the file.`,
        );
      if (r.comment_text.length > 10000)
        fail("Comment exceeds 10,000 characters.");
      ids.add(r.comment_id);
      comments.push({
        id: r.comment_id,
        postId: post.id,
        text: r.comment_text,
      });
    }
  });
  for (const p of posts.values())
    if (comments.filter((c) => c.postId === p.id).length > p.reportedComments)
      throw new Error(
        `Post ${p.id}: imported comments exceed reported_comments.`,
      );
  const types = parsed.data.map((r) =>
    (r.dataset_type ?? "user-supplied").trim(),
  );
  if (types.some((t) => !["synthetic", "user-supplied"].includes(t)))
    throw new Error(
      "dataset_type must be synthetic or user-supplied when provided.",
    );
  if (new Set(types).size > 1)
    throw new Error(
      "Do not mix synthetic and user-supplied rows in one dataset.",
    );
  return {
    posts: [...posts.values()],
    comments,
    synthetic: types[0] === "synthetic",
    name,
  };
}
const rules: {
  category: Category;
  id: string;
  reason: string;
  patterns: RegExp[];
}[] = [
  {
    category: "Buying intent",
    id: "purchase-action",
    reason: "Explicit purchase action or request for a purchase route.",
    patterns: [
      /\b(?:where|how) (?:can|do|could) (?:i|we) (?:buy|order|purchase)\b/gi,
      /\b(?:buy|order|purchase) (?:link|this|one|it|now)\b/gi,
      /\b(?:send|share|drop) (?:me )?(?:the |a )?(?:link|checkout)\b/gi,
      /\b(?:i|we)(?:'ll| will| want to| need to| am going to) (?:buy|order|purchase)\b/gi,
      /\b(?:ready to buy|take my money|add to cart)\b/gi,
    ],
  },
  {
    category: "Consideration",
    id: "product-question",
    reason:
      "Product, price or availability question; no explicit purchase action.",
    patterns: [
      /\b(?:price|cost|how much|shipping|delivery|in stock|available|sizes?|warranty)\b/gi,
      /\bdoes (?:it|this) (?:work|fit|support)\b/gi,
    ],
  },
  {
    category: "Ambiguous",
    id: "weak-desire",
    reason: "Interest or uncertain language needs human interpretation.",
    patterns: [
      /\b(?:need this|want this|maybe|might|wish|looks tempting|link\??)\b/gi,
    ],
  },
];
export function classify(original: string): Result {
  const text = original.replace(/[’‘]/g, "'");
  const negativePattern =
    /\b(?:(?:do not|don't|dont|would not|wouldn't|won't|will not|never|not going to|not|can't|cannot) (?:\w+ ){0,3}(?:buy|order|purchase|want|need|send|share)|not interested|too expensive|not worth|scam)\b/gi;
  const negative = [...text.matchAll(negativePattern)].map((m) => m[0]);
  const positiveText = text.replace(negativePattern, " ");
  const matched = rules
    .map((r) => ({
      ...r,
      evidence: r.patterns.flatMap((p) =>
        [...positiveText.matchAll(p)].map((m) => m[0]),
      ),
    }))
    .filter((r) => r.evidence.length);
  const explicit = matched.find((r) => r.category === "Buying intent");
  const uncertain = [
    ...text.matchAll(
      /\b(?:if|maybe|might|wish|would|joking|jk|lol|not sure)\b/gi,
    ),
  ].map((m) => m[0]);
  if (negative.length && explicit)
    return {
      category: "Ambiguous",
      evidence: [...negative, ...explicit.evidence],
      reason:
        "Conflicting purchase and negative language. Review the full comment.",
      rule: "mixed-signals",
    };
  if (negative.length)
    return {
      category: "Negative",
      evidence: negative,
      reason:
        "Negative or negated purchase language takes precedence over product questions.",
      rule: "negative-intent",
    };
  if (explicit && uncertain.length)
    return {
      category: "Ambiguous",
      evidence: [...explicit.evidence, ...uncertain],
      reason:
        "Purchase language is conditional, uncertain or possibly humorous.",
      rule: "qualified-purchase",
    };
  const first = matched[0];
  return first
    ? {
        category: first.category,
        evidence: [...new Set(first.evidence)],
        reason: first.reason,
        rule: first.id,
      }
    : {
        category: "Other",
        evidence: [],
        reason:
          "No supported buying-intent or product-question phrase matched.",
        rule: "no-match",
      };
}
export function aggregate(data: Dataset, reviews: Reviews = {}) {
  return data.posts.map((post) => {
    const comments = data.comments.filter((c) => c.postId === post.id);
    const counts = Object.fromEntries(
      categories.map((cat) => [
        cat,
        comments.filter(
          (c) =>
            (reviewFor(reviews, c.id)?.category ??
              classify(c.text).category) === cat,
        ).length,
      ]),
    ) as Record<Category, number>;
    return {
      ...post,
      imported: comments.length,
      counts,
      intentRate: comments.length
        ? (counts["Buying intent"] / comments.length) * 100
        : null,
      coverage: post.reportedComments
        ? (comments.length / post.reportedComments) * 100
        : null,
      reviewed: comments.filter((c) => reviewFor(reviews, c.id)).length,
    };
  });
}
// Prefix spreadsheet formulas; raw comment text is displayed without executing HTML.
export function csv(rows: Record<string, unknown>[]) {
  return Papa.unparse(
    rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([k, v]) => [
          k,
          typeof v === "string" && /^[\s]*[=+@-]/.test(v) ? `'${v}` : v,
        ]),
      ),
    ),
  );
}
export function exportEvidence(
  data: Dataset,
  reviews: Reviews = {},
  selected?: Comment[],
) {
  return csv(
    (selected ?? data.comments).map((c) => {
      const result = classify(c.text);
      const review = reviewFor(reviews, c.id);
      return {
        dataset: data.name,
        synthetic: data.synthetic,
        rule_version: VERSION,
        post_id: c.postId,
        comment_id: c.id,
        comment_text: c.text,
        automatic_category: result.category,
        effective_category: review?.category ?? result.category,
        matched_evidence: result.evidence.join(" | "),
        rule: result.rule,
        reason: result.reason,
        review_note: review?.note ?? "",
        reviewed_at: review?.at ?? "",
      };
    }),
  );
}
export function exportPosts(data: Dataset, reviews: Reviews = {}) {
  return csv(
    aggregate(data, reviews).map((p) => ({
      dataset: data.name,
      synthetic: data.synthetic,
      rule_version: VERSION,
      post_id: p.id,
      creator: p.creator,
      title: p.title,
      views: p.views,
      likes: p.likes,
      reported_comments: p.reportedComments,
      imported_comments: p.imported,
      buying_intent_comments: p.counts["Buying intent"],
      intent_share_percent: p.intentRate?.toFixed(2) ?? "",
      coverage_percent: p.coverage?.toFixed(2) ?? "",
      reviewed_comments: p.reviewed,
      interpretation:
        "Observed comment intent; not conversions. Views are not unique reach.",
    })),
  );
}
