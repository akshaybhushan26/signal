import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("overview, evidence, import dialog and method meet automated WCAG checks", async ({
  page,
}) => {
  await page.goto("/");
  const check = async () => {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  };
  await check();
  await page.getByRole("button", { name: "Comment evidence" }).click();
  await check();
  await page.getByRole("button", { name: "Import CSV", exact: true }).click();
  await check();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Method & definitions" }).click();
  await check();
});
