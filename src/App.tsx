import { useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Check,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Info,
  MessageSquare,
  Search,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
import {
  reviewFor,
  aggregate,
  categories,
  classify,
  exportEvidence,
  exportPosts,
  parseCSV,
  VERSION,
  type Category,
  type Comment,
  type Dataset,
  type Reviews,
} from "./lib/engine";
import { demo, demoCSV, templateCSV } from "./lib/demo";
const format = (n: number) =>
  Intl.NumberFormat("en", {
    notation: n >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(n);
const percent = (n: number | null) => (n === null ? "—" : `${n.toFixed(1)}%`);
function download(
  name: string,
  content: string,
  type = "text/csv;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Badge({ category }: { category: Category }) {
  return (
    <span className={`badge ${category.toLowerCase().replaceAll(" ", "-")}`}>
      {category}
    </span>
  );
}
export default function App() {
  const [data, setData] = useState<Dataset>(demo);
  const [reviews, setReviews] = useState<Reviews>({});
  const [tab, setTab] = useState<"overview" | "evidence" | "method">(
    "overview",
  );
  const [post, setPost] = useState("all");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [dialog, setDialog] = useState<"import" | "export" | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Comment | null>(null);
  const [decision, setDecision] = useState<Category>("Ambiguous");
  const [note, setNote] = useState("");
  const [reviewError, setReviewError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const stats = useMemo(() => aggregate(data, reviews), [data, reviews]);
  const selectedStats = stats.filter((p) => post === "all" || p.id === post);
  const total = selectedStats.reduce(
    (a, p) => ({
      views: a.views + p.views,
      imported: a.imported + p.imported,
      intent: a.intent + p.counts["Buying intent"],
      reported: a.reported + p.reportedComments,
      ambiguous: a.ambiguous + p.counts.Ambiguous,
    }),
    { views: 0, imported: 0, intent: 0, reported: 0, ambiguous: 0 },
  );
  const filtered = useMemo(
    () =>
      data.comments.filter((c) => {
        const cat =
          reviewFor(reviews, c.id)?.category ?? classify(c.text).category;
        return (
          (post === "all" || c.postId === post) &&
          (category === "all" || cat === category) &&
          (!pending || (!reviewFor(reviews, c.id) && cat === "Ambiguous")) &&
          c.text.toLowerCase().includes(query.toLowerCase())
        );
      }),
    [data, reviews, post, category, pending, query],
  );
  const [page, setPage] = useState(1);
  const shown = filtered.slice((page - 1) * 12, page * 12);
  function resetFilters() {
    setPost("all");
    setCategory("all");
    setQuery("");
    setPending(false);
    setPage(1);
  }
  function openDialog(which: "import" | "export") {
    opener.current = document.activeElement as HTMLElement;
    setDialog(which);
    setError("");
  }
  function close() {
    setDialog(null);
    setSelected(null);
    setReviewError("");
    opener.current?.focus();
  }
  function inspect(c: Comment) {
    opener.current = document.activeElement as HTMLElement;
    setSelected(c);
    setDecision(
      reviewFor(reviews, c.id)?.category ?? classify(c.text).category,
    );
    setNote(reviewFor(reviews, c.id)?.note ?? "");
    setReviewError("");
  }
  async function importFile(file: File) {
    setBusy(true);
    setError("");
    try {
      if (file.size > 5_000_000)
        throw new Error("File exceeds the 5 MB limit.");
      const imported = parseCSV(await file.text(), file.name);
      setData(imported);
      setReviews({});
      resetFilters();
      setNotice(
        `Imported ${imported.posts.length} posts and ${imported.comments.length} comments. Previous review decisions were cleared.`,
      );
      setTab("overview");
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read this file.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  const best = [...selectedStats]
    .filter((p) => p.imported)
    .sort((a, b) => (b.intentRate ?? 0) - (a.intentRate ?? 0))[0];
  const anyModal = dialog || selected;
  return (
    <div className="app">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("overview");
          }}
        >
          <Activity size={27} />
          <span>
            signal<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="workspace-label">CREATOR INTELLIGENCE</div>
        <nav aria-label="Main navigation">
          <button
            className={tab === "overview" ? "active" : ""}
            onClick={() => setTab("overview")}
          >
            <SlidersHorizontal size={18} /> Overview
          </button>
          <button
            className={tab === "evidence" ? "active" : ""}
            onClick={() => setTab("evidence")}
          >
            <MessageSquare size={18} /> Comment evidence{" "}
            <span className="nav-count">{data.comments.length}</span>
          </button>
          <button
            className={tab === "method" ? "active" : ""}
            onClick={() => setTab("method")}
          >
            <FileText size={18} /> Method & definitions
          </button>
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <span>
            Workspace <ChevronRight size={14} />{" "}
            <strong>{data.synthetic ? "Intent workbench" : data.name}</strong>
          </span>
          <span className="rules-pill">
            <span /> {data.synthetic ? "SYNTHETIC EXAMPLE" : "IMPORTED DATA"}
          </span>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <p className="eyebrow">FROM ATTENTION TO INTENTION</p>
              <h1>
                {tab === "overview"
                  ? "Find the signal in the scroll."
                  : tab === "evidence"
                    ? "The words behind the numbers."
                    : "How Signal reads intent."}
              </h1>
              <p className="subtitle">
                {tab === "overview"
                  ? "Understand which creator posts spark buying conversations."
                  : tab === "evidence"
                    ? "Inspect every match. Bring your judgment to the uncertain ones."
                    : "Every classification is inspectable, repeatable and open to review."}
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="button secondary"
                onClick={() => openDialog("export")}
              >
                <Download size={16} /> Export findings
              </button>
              <button
                className="button primary"
                onClick={() => openDialog("import")}
              >
                <Upload size={16} /> Import CSV
              </button>
            </div>
          </div>
          <div className="dataset-actions">
            <button
              className="text-button"
              onClick={() => {
                setData(demo());
                setReviews({});
                resetFilters();
                setNotice("Example reset.");
              }}
            >
              Reset
            </button>
          </div>
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {tab !== "method" && (
            <div className="filter-row">
              <label className="select-wrap">
                <Filter size={16} />
                <span className="sr-only">Filter by post</span>
                <select
                  aria-label="Filter by post"
                  value={post}
                  onChange={(e) => {
                    setPost(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All creator posts</option>
                  {data.posts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.creator} · {p.title}
                    </option>
                  ))}
                </select>
              </label>
              <span className="filter-note">
                {post === "all" ? "Full dataset" : "Selected post"} · review
                decisions included
              </span>
            </div>
          )}
          {tab === "overview" && (
            <>
              <section className="metrics" aria-label="Dataset metrics">
                <article>
                  <span>
                    Post views <Info size={14} />
                  </span>
                  <strong>{format(total.views)}</strong>
                  <p>Total views across selected posts</p>
                </article>
                <article className="highlight">
                  <span>
                    Observed buying intent <MessageSquare size={14} />
                  </span>
                  <strong>
                    {total.intent}
                    <small>comments</small>
                  </strong>
                  <p>
                    {percent(
                      total.imported
                        ? (total.intent / total.imported) * 100
                        : null,
                    )}{" "}
                    of {total.imported} imported comments
                  </p>
                </article>
                <article>
                  <span>
                    Comment coverage <Info size={14} />
                  </span>
                  <strong>
                    {percent(
                      total.reported
                        ? (total.imported / total.reported) * 100
                        : null,
                    )}
                  </strong>
                  <p>
                    {total.imported} imported / {format(total.reported)}{" "}
                    reported
                  </p>
                </article>
                <article>
                  <span>
                    Ambiguous comments <Search size={14} />
                  </span>
                  <strong>
                    {total.ambiguous}
                    <small>to interpret</small>
                  </strong>
                  <button
                    className="text-button"
                    onClick={() => {
                      setTab("evidence");
                      setCategory("Ambiguous");
                      setPending(false);
                      setPage(1);
                    }}
                  >
                    Inspect ambiguous evidence <ChevronRight size={14} />
                  </button>
                </article>
              </section>
              <div className="analysis-grid">
                <section className="panel comparison">
                  <div className="panel-heading">
                    <div>
                      <h2>Attention ≠ buying intent</h2>
                      <p>Compare scale with the quality of the conversation.</p>
                    </div>
                    <span className="small-tag">POST COMPARISON</span>
                  </div>
                  <div className="comparison-head">
                    <span>Creator / post</span>
                    <span>Post views</span>
                    <span>Intent share</span>
                  </div>
                  {selectedStats.map((p, i) => (
                    <button
                      className="comparison-row"
                      key={p.id}
                      onClick={() => {
                        setPost(p.id);
                        setTab("evidence");
                        setPage(1);
                      }}
                    >
                      <div className="creator-cell">
                        <span className={`avatar avatar-${i % 4}`}>
                          {p.creator
                            .split(" ")
                            .map((s) => s[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <div>
                          <strong>{p.creator}</strong>
                          <span>{p.title}</span>
                        </div>
                      </div>
                      <div className="bar-cell">
                        <span>{format(p.views)}</span>
                        <div className="bar-track">
                          <div
                            className="views-bar"
                            style={{
                              width: `${(p.views / Math.max(1, ...selectedStats.map((s) => s.views))) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="bar-cell">
                        <span className="intent-number">
                          {percent(p.intentRate)}
                          <small>
                            {p.counts["Buying intent"]} / {p.imported} comments
                          </small>
                        </span>
                        <div className="bar-track">
                          <div
                            className="intent-bar"
                            style={{ width: `${p.intentRate ?? 0}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  ))}
                  <div className="chart-foot">
                    <span>
                      <i className="legend views" /> Views, relative to largest
                      post
                    </span>
                    <span>
                      <i className="legend intent" /> Buying intent / imported
                      comments
                    </span>
                  </div>
                </section>
                <aside className="insight-card">
                  <span className="insight-symbol">
                    <Activity size={26} />
                  </span>
                  <p className="eyebrow">A CLOSER LOOK</p>
                  <h2>
                    {best
                      ? `${best.creator.split(" ")[0]}'s audience is asking to buy.`
                      : "No comments to classify yet."}
                  </h2>
                  <p>
                    {best
                      ? `${best.counts["Buying intent"]} of ${best.imported} imported comments show buying intent (${percent(best.intentRate)}).`
                      : "Import comments to compare observed buying intent."}
                  </p>
                  <button
                    className="button cream"
                    disabled={!best}
                    onClick={() => {
                      if (best) {
                        setPost(best.id);
                        setCategory("Buying intent");
                        setTab("evidence");
                        setPage(1);
                      }
                    }}
                  >
                    Explore the evidence <ArrowUpRight size={17} />
                  </button>
                </aside>
              </div>
              <section className="panel breakdown">
                <div className="panel-heading">
                  <div>
                    <h2>What the comments are saying</h2>
                    <p>
                      Effective labels across {total.imported} imported
                      comments.
                    </p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => {
                      setTab("evidence");
                      setCategory("all");
                      setPending(false);
                    }}
                  >
                    View all evidence <ChevronRight size={16} />
                  </button>
                </div>
                <div
                  className="distribution"
                  aria-label="Comment category distribution"
                >
                  {categories.map((cat) => {
                    const count = selectedStats.reduce(
                      (a, p) => a + p.counts[cat],
                      0,
                    );
                    return count > 0 ? (
                      <div
                        key={cat}
                        className={cat.toLowerCase().replaceAll(" ", "-")}
                        style={{ width: `${(count / total.imported) * 100}%` }}
                        title={`${cat}: ${count}`}
                      />
                    ) : null;
                  })}
                </div>
                <div className="breakdown-legend">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setCategory(cat);
                        setTab("evidence");
                        setPending(false);
                        setPage(1);
                      }}
                    >
                      <i className={cat.toLowerCase().replaceAll(" ", "-")} />
                      <span>{cat}</span>
                      <strong>
                        {selectedStats.reduce((a, p) => a + p.counts[cat], 0)}
                      </strong>
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}
          {tab === "evidence" && (
            <section className="panel evidence-panel">
              <div className="panel-heading">
                <div>
                  <h2>Comment evidence</h2>
                  <p>
                    {filtered.length} matching comments ·{" "}
                    {Object.keys(reviews).length} human reviews in this dataset
                  </p>
                </div>
                <button
                  className="text-button"
                  onClick={() =>
                    download(
                      "signal-filtered-evidence.csv",
                      exportEvidence(data, reviews, filtered),
                    )
                  }
                >
                  <Download size={16} /> Export filtered evidence
                </button>
              </div>
              <div className="evidence-controls">
                <label className="search-box">
                  <Search size={17} />
                  <input
                    aria-label="Search comments"
                    placeholder="Search comment text…"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                    }}
                  />
                </label>
                <select
                  aria-label="Filter by intent"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All intent categories</option>
                  {categories.map((cat) => (
                    <option key={cat}>{cat}</option>
                  ))}
                </select>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={pending}
                    onChange={(e) => {
                      setPending(e.target.checked);
                      setPage(1);
                    }}
                  />{" "}
                  Unreviewed ambiguous
                </label>
                <button className="text-button" onClick={resetFilters}>
                  Clear filters
                </button>
              </div>
              <div className="comment-list">
                {shown.map((c) => {
                  const result = classify(c.text);
                  const p = data.posts.find((p) => p.id === c.postId)!;
                  return (
                    <article className="comment-row" key={c.id}>
                      <div>
                        <div className="comment-meta">
                          {p.creator} <span>· {c.id}</span>
                          {reviewFor(reviews, c.id) && (
                            <span className="review-check">
                              <Check size={13} /> Reviewed
                            </span>
                          )}
                        </div>
                        <p>“{c.text}”</p>
                        <div className="matched-line">
                          {result.evidence.length ? (
                            <>
                              Matched:{" "}
                              <strong>{result.evidence.join(" · ")}</strong>
                            </>
                          ) : (
                            "No supported phrase matched"
                          )}
                        </div>
                      </div>
                      <div className="comment-actions">
                        <Badge
                          category={
                            reviewFor(reviews, c.id)?.category ??
                            result.category
                          }
                        />
                        <button
                          className="button secondary compact"
                          onClick={() => inspect(c)}
                        >
                          Inspect & review <ChevronRight size={14} />
                        </button>
                      </div>
                    </article>
                  );
                })}
                {!filtered.length && (
                  <div className="empty-state">
                    <Search size={28} />
                    <h3>No matching comments</h3>
                    <p>Try a different category or clear your filters.</p>
                    <button className="button secondary" onClick={resetFilters}>
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
              <div className="pagination">
                <span>
                  Showing {filtered.length ? (page - 1) * 12 + 1 : 0}–
                  {Math.min(page * 12, filtered.length)} of {filtered.length}
                </span>
                <div>
                  <button
                    className="button secondary compact"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <button
                    className="button secondary compact"
                    disabled={page * 12 >= filtered.length}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
          )}
          {tab === "method" && (
            <div className="method-grid">
              <section className="panel method">
                <p className="eyebrow">{VERSION} · ENGLISH PHRASE RULES</p>
                <h2>Transparent rules, in priority order.</h2>
                <ol>
                  <li>
                    <strong>Negative or negated intent</strong>
                    <p>
                      “Won’t buy”, “not interested”, “too expensive” and related
                      phrases take precedence. Mixed positive and negative
                      signals become ambiguous.
                    </p>
                  </li>
                  <li>
                    <strong>Explicit buying intent</strong>
                    <p>
                      Purchase actions and routes: “where can I buy”, “send me
                      the link”, “I will order”. Conditional or humorous
                      language such as “maybe”, “if” and “lol” becomes
                      ambiguous.
                    </p>
                  </li>
                  <li>
                    <strong>Consideration</strong>
                    <p>
                      Price, size, shipping, availability, warranty or fit
                      questions without a supported purchase action.
                    </p>
                  </li>
                  <li>
                    <strong>Ambiguous interest</strong>
                    <p>
                      Weak desire (“need this”), uncertain language (“might”),
                      and a bare “link”. Review context before treating it as
                      intent.
                    </p>
                  </li>
                  <li>
                    <strong>Other</strong>
                    <p>
                      No supported phrase. This includes some genuine intent the
                      rules miss. The model is intentionally limited.
                    </p>
                  </li>
                </ol>
                <p>
                  Review any comment with a reason. Both the original
                  classification and the human decision are retained in evidence
                  exports.
                </p>
              </section>
              <div>
                <section className="panel method">
                  <h2>Read the denominators.</h2>
                  <dl>
                    <dt>Post views</dt>
                    <dd>
                      Sum of reported views, counted once per post. Repeat
                      viewers and overlap between creators are unknown. This is
                      not unique reach.
                    </dd>
                    <dt>Intent share</dt>
                    <dd>
                      Buying-intent comments ÷ imported comments for the same
                      post. Includes human decisions. Counts comments, not
                      people or customers.
                    </dd>
                    <dt>Comment coverage</dt>
                    <dd>
                      Imported comments ÷ reported comments. Partial samples may
                      be biased. Zero denominator displays “—”.
                    </dd>
                    <dt>Conversion</dt>
                    <dd>
                      Not measured. No purchases, revenue or attribution data
                      are collected.
                    </dd>
                  </dl>
                </section>
              </div>
            </div>
          )}
        </main>
      </div>
      {anyModal && (
        <div
          className="overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            className="modal"
            ref={(el) => {
              if (el && !el.contains(document.activeElement)) el.focus();
            }}
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
              if (e.key === "Tab") {
                const items = Array.from(
                  e.currentTarget.querySelectorAll<HTMLElement>(
                    "button:not(:disabled), input, select, textarea, a[href]",
                  ),
                );
                const first = items[0],
                  last = items.at(-1);
                if (
                  e.shiftKey &&
                  (document.activeElement === first ||
                    document.activeElement === e.currentTarget)
                ) {
                  e.preventDefault();
                  last?.focus();
                } else if (
                  !e.shiftKey &&
                  (document.activeElement === last ||
                    document.activeElement === e.currentTarget)
                ) {
                  e.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            <button
              className="close-button"
              aria-label="Close dialog"
              onClick={close}
            >
              <X size={20} />
            </button>
            {dialog === "import" && (
              <>
                <p className="eyebrow">BRING YOUR OWN DATA</p>
                <h2 id="dialog-title">Import creator posts</h2>
                <p>
                  One row per comment. Repeat identical post metrics on each
                  row. Use a blank comment ID and text for a post without
                  imported comments.
                </p>
                <div
                  className="upload-zone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file && !busy) void importFile(file);
                  }}
                >
                  <Upload size={30} />
                  <h3>Drop a CSV here</h3>
                  <p>Up to 5 MB / 10,000 rows · UTF-8</p>
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => input.current?.click()}
                  >
                    {busy ? "Reading file…" : "Choose CSV file"}
                  </button>
                  <input
                    ref={input}
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    aria-label="Upload CSV file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void importFile(file);
                    }}
                  />
                </div>
                {error && (
                  <div className="error" role="alert">
                    {error}
                  </div>
                )}
                <div className="import-links">
                  <button
                    className="text-button"
                    onClick={() => download("signal-template.csv", templateCSV)}
                  >
                    <Download size={16} /> Download blank template
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      download("signal-synthetic-example.csv", demoCSV)
                    }
                  >
                    <Download size={16} /> Synthetic example CSV
                  </button>
                </div>
                <details>
                  <summary>Expected columns & validation</summary>
                  <p className="code-text">
                    post_id, creator, post_title, views, likes,
                    reported_comments, comment_id, comment_text
                  </p>
                  <p>
                    Metrics must be whole numbers ≥ 0; likes ≤ views; imported
                    comments ≤ reported comments. Comment IDs are globally
                    unique. Optional dataset_type is synthetic or user-supplied;
                    mark invented data synthetic. Empty files, conflicting
                    metrics and malformed CSV are rejected. Imports replace the
                    current dataset and clear reviews.
                  </p>
                </details>
              </>
            )}
            {dialog === "export" && (
              <>
                <p className="eyebrow">TAKE THE EVIDENCE WITH YOU</p>
                <h2 id="dialog-title">Export findings</h2>
                <p>
                  Full dataset exports include {data.posts.length} posts and{" "}
                  {data.comments.length} comments.
                </p>
                <button
                  className="export-option"
                  onClick={() => {
                    download(
                      "signal-post-findings.csv",
                      exportPosts(data, reviews),
                    );
                    setNotice("Post findings exported for the full dataset.");
                  }}
                >
                  <FileText />
                  <span>
                    <strong>Post findings</strong>
                    <small>
                      Views, intent share, coverage and denominators
                    </small>
                  </span>
                  <Download size={18} />
                </button>
                <button
                  className="export-option"
                  onClick={() => {
                    download(
                      "signal-comment-evidence.csv",
                      exportEvidence(data, reviews),
                    );
                    setNotice(
                      "Comment evidence exported for the full dataset.",
                    );
                  }}
                >
                  <MessageSquare />
                  <span>
                    <strong>Comment evidence & reviews</strong>
                    <small>
                      Matched text, automatic labels and human decisions
                    </small>
                  </span>
                  <Download size={18} />
                </button>
              </>
            )}
            {selected &&
              (() => {
                const result = classify(selected.text);
                const p = data.posts.find((p) => p.id === selected.postId)!;
                return (
                  <>
                    <p className="eyebrow">
                      {p.creator} · {selected.id}
                    </p>
                    <h2 id="dialog-title">Inspect the evidence</h2>
                    <blockquote>{selected.text}</blockquote>
                    <div className="rule-box">
                      <Badge category={result.category} />
                      <p>{result.reason}</p>
                      <span>
                        Rule: {result.rule} · {VERSION}
                      </span>
                      <div className="evidence-tags">
                        {result.evidence.map((s, i) => (
                          <mark key={i}>{s}</mark>
                        ))}
                        {!result.evidence.length && (
                          <span>No matched phrase</span>
                        )}
                      </div>
                    </div>
                    <label className="field-label">
                      Your decision
                      <select
                        aria-label="Review decision"
                        value={decision}
                        onChange={(e) =>
                          setDecision(e.target.value as Category)
                        }
                      >
                        {categories.map((cat) => (
                          <option key={cat}>{cat}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field-label">
                      Review reason (required)
                      <textarea
                        aria-label="Review reason"
                        placeholder="What in this comment supports your decision?"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={1000}
                      />
                    </label>
                    {reviewError && (
                      <p className="error" role="alert">
                        {reviewError}
                      </p>
                    )}
                    <div className="modal-actions">
                      {reviewFor(reviews, selected.id) && (
                        <button
                          className="text-button"
                          onClick={() => {
                            setReviews((r) => {
                              const next = { ...r };
                              delete next[selected.id];
                              return next;
                            });
                            setNotice(
                              "Review removed. Automatic classification restored.",
                            );
                            close();
                          }}
                        >
                          Restore automatic result
                        </button>
                      )}
                      <button
                        className="button primary"
                        onClick={() => {
                          if (!note.trim()) {
                            setReviewError(
                              "Add a reason so this decision can be inspected later.",
                            );
                            return;
                          }
                          setReviews((r) => ({
                            ...r,
                            [selected.id]: {
                              category: decision,
                              note: note.trim(),
                              at: new Date().toISOString(),
                            },
                          }));
                          setNotice(
                            "Review saved. Metrics and exports now include your decision.",
                          );
                          close();
                        }}
                      >
                        Save review
                      </button>
                    </div>
                  </>
                );
              })()}
          </div>
        </div>
      )}
    </div>
  );
}
