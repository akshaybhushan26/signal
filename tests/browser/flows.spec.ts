import { test, expect } from "@playwright/test";
import { demoCSV, templateCSV } from "../../src/lib/demo";
test("synthetic demo, evidence filtering, review, exports and validation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("SYNTHETIC EXAMPLE", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Comment evidence" }).click();
  await page.getByLabel("Filter by intent").selectOption("Ambiguous");
  await page.getByRole("button", { name: "Inspect & review" }).first().click();
  await page.getByLabel("Review decision").selectOption("Buying intent");
  await page.getByRole("button", { name: "Save review" }).click();
  await expect(page.getByRole("alert")).toContainText("Add a reason");
  await page
    .getByLabel("Review reason")
    .fill("Reviewed the full wording and confirmed the purchase request.");
  await page.getByRole("button", { name: "Save review" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Filter by intent").selectOption("all");
  await page.getByLabel("Search comments").fill("need this");
  await expect(page.getByText("Reviewed", { exact: true })).toBeVisible();
  const evidence = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export filtered evidence" }).click();
  expect((await evidence).suggestedFilename()).toBe(
    "signal-filtered-evidence.csv",
  );
  await page.getByRole("button", { name: "Import CSV", exact: true }).click();
  const template = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download blank template" }).click();
  expect((await template).suggestedFilename()).toBe("signal-template.csv");
  await page.getByLabel("Upload CSV file").setInputFiles({
    name: "bad.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("bad\ndata"),
  });
  await expect(page.getByRole("alert")).toContainText("Missing columns");
  await page.getByLabel("Upload CSV file").setInputFiles({
    name: "study.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(demoCSV.replaceAll("synthetic", "user-supplied")),
  });
  await expect(page.getByText("IMPORTED DATA", { exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Export findings" }).click();
  const posts = page.waitForEvent("download");
  await page.getByRole("button", { name: "Post findings Views" }).click();
  expect((await posts).suggestedFilename()).toBe("signal-post-findings.csv");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("zero-comment dataset, responsive layout and keyboard dialog", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Import CSV", exact: true }).click();
  await page.getByLabel("Upload CSV file").setInputFiles({
    name: "empty-comments.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(templateCSV + "p,Mira,Empty post,0,0,0,,"),
  });
  await expect(page.getByText("No comments to classify yet.")).toBeVisible();
  await page.getByRole("button", { name: "Comment evidence" }).click();
  await expect(page.getByText("No matching comments")).toBeVisible();
  await page.getByRole("button", { name: "Import CSV", exact: true }).click();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Import CSV", exact: true }),
  ).toBeFocused();
});
test("post filtering, review restoration, synthetic re-import and focus trap", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Filter by post").selectOption("p02");
  await expect(page.getByText("28.6K", { exact: true })).toHaveCount(2);
  await page.getByRole("button", { name: "Comment evidence" }).click();
  await expect(page.getByText("12 matching comments")).toBeVisible();
  await page.getByRole("button", { name: "Inspect & review" }).first().click();
  await page.getByLabel("Review decision").selectOption("Other");
  await page
    .getByLabel("Review reason")
    .fill("Not relevant in the surrounding conversation.");
  await page.getByRole("button", { name: "Save review" }).click();
  await page.getByRole("button", { name: "Inspect & review" }).first().click();
  await page.getByRole("button", { name: "Restore automatic result" }).click();
  await expect(page.getByText("Reviewed", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Import CSV", exact: true }).click();
  await page.getByRole("button", { name: "Close dialog" }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Close dialog" }),
  ).not.toBeFocused();
  await page.getByLabel("Upload CSV file").setInputFiles({
    name: "renamed.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(demoCSV),
  });
  await expect(
    page.getByText("SYNTHETIC EXAMPLE", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Import CSV", exact: true }).click();
  await page.getByLabel("Upload CSV file").setInputFiles({
    name: "invalid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(templateCSV),
  });
  await expect(page.getByRole("alert")).toContainText("No data rows");
  await page.keyboard.press("Escape");
  await expect(
    page.getByText("SYNTHETIC EXAMPLE", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("280.4K", { exact: true })).toBeVisible();
});
