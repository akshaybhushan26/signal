import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregate,
  classify,
  csv,
  exportEvidence,
  parseCSV,
} from "../src/lib/engine";
import { demo, demoCSV, templateCSV } from "../src/lib/demo";
test("CSV handles quoted commas, newline and BOM without losing evidence", () => {
  const d = parseCSV(
    "\uFEFF" +
      csv([
        {
          post_id: "a",
          creator: "M",
          post_title: "Title",
          views: 10,
          likes: 2,
          reported_comments: 1,
          comment_id: "x",
          comment_text: "Price, please?\nThanks!",
        },
      ]),
  );
  assert.equal(d.comments[0].text, "Price, please?\nThanks!");
});
test("post metrics are counted once across repeated comment rows", () => {
  const d = demo();
  const rows = aggregate(d);
  assert.equal(
    rows.reduce((a, p) => a + p.views, 0),
    280400,
  );
  assert.equal(d.comments.length, 48);
  assert.equal(
    rows.reduce((a, p) => a + p.imported, 0),
    48,
  );
});
test("validation rejects missing headers, empty files, conflicting rows and duplicate IDs", () => {
  assert.throws(() => parseCSV("foo\nbar"), /Missing columns/);
  assert.throws(() => parseCSV(templateCSV), /No data/);
  assert.throws(() => parseCSV(demoCSV.replace("84200", "84201")), /conflict/);
  assert.throws(
    () => parseCSV(demoCSV.replace("p01-c2", "p01-c1")),
    /Duplicate/,
  );
  assert.throws(() => parseCSV(demoCSV.replace("84200", "-1")), /whole number/);
  assert.throws(
    () => parseCSV(demoCSV.replaceAll(",420,", ",1,")),
    /exceed reported/,
  );
});
test("malformed CSV, blank metrics and unpaired comments are rejected", () => {
  assert.throws(() => parseCSV(templateCSV + '"oops'), /CSV row/);
  assert.throws(
    () =>
      parseCSV(
        "post_id,creator,post_title,views,likes,reported_comments,comment_id,comment_text\np,M,T,,0,1,c,hello",
      ),
    /whole number/,
  );
  assert.throws(() => parseCSV(templateCSV + "p,M,T,2,1,1,,hello"), /both/);
});
test("classification differentiates actions, questions, weak desire and negation", () => {
  for (const [text, expected] of [
    ["Where can I buy this?", "Buying intent"],
    ["What is the price?", "Consideration"],
    ["Need this", "Ambiguous"],
    ["I won’t buy this", "Negative"],
    ["I don't want to buy this", "Negative"],
    ["Love the video", "Other"],
    ["Maybe I will buy this", "Ambiguous"],
    ["I won't buy this, but I will order one for my friend", "Ambiguous"],
  ] as const) {
    assert.equal(classify(text).category, expected, text);
  }
  assert.ok(classify("Where can I buy this?").evidence[0].includes("buy"));
});
test("review decisions change effective totals without changing original evidence", () => {
  const d = demo();
  const c = d.comments.find((c) => classify(c.text).category === "Ambiguous")!;
  const before = aggregate(d);
  const reviews = {
    [c.id]: {
      category: "Buying intent" as const,
      note: "Confirmed purchase route",
      at: "2026-10-09T00:00:00Z",
    },
  };
  const after = aggregate(d, reviews);
  assert.equal(
    after.reduce((a, p) => a + p.counts["Buying intent"], 0),
    before.reduce((a, p) => a + p.counts["Buying intent"], 0) + 1,
  );
  const exported = exportEvidence(d, reviews);
  assert.match(exported, /Confirmed purchase route/);
  assert.match(exported, /Ambiguous,Buying intent/);
  assert.match(exported, /true,rules-1.0/);
});
test("empty comment denominator is undefined rather than a misleading zero", () => {
  const d = parseCSV(templateCSV + "p,M,T,0,0,0,,");
  const p = aggregate(d)[0];
  assert.equal(p.intentRate, null);
  assert.equal(p.coverage, null);
  assert.equal(p.imported, 0);
});
test("exports neutralize formula injection including leading whitespace", () => {
  assert.match(csv([{ comment: '=HYPERLINK("x")' }]), /'=HYPERLINK/);
  assert.match(csv([{ comment: "  @SUM(1)" }]), /'  @SUM/);
});
test("synthetic provenance survives renamed CSV imports and mixed provenance is rejected", () => {
  assert.equal(parseCSV(demoCSV, "renamed.csv").synthetic, true);
  assert.throws(
    () => parseCSV(demoCSV.replace("synthetic", "user-supplied")),
    /mix synthetic/,
  );
});
test("likes above views and oversized inputs are rejected", () => {
  assert.throws(
    () => parseCSV(templateCSV + "p,M,T,1,2,0,,"),
    /likes cannot exceed/,
  );
  assert.throws(() => parseCSV("a".repeat(5_000_001)), /5 MB/);
});
test("untrusted comment IDs cannot inherit review decisions from object prototypes", () => {
  const d = parseCSV(templateCSV + "p,M,T,1,0,1,constructor,hello");
  assert.equal(aggregate(d)[0].reviewed, 0);
  assert.match(exportEvidence(d), /Other,Other/);
});
