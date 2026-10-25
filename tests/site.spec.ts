import { expect, test, type Page } from "@playwright/test";

const navigation = (page: Page) =>
  page.getByRole("navigation", { name: "Explore the world" });
const fits = async (page: Page) => {
  expect(
    await page.evaluate(() => ({
      width: document.documentElement.scrollWidth <= innerWidth,
      height: document.documentElement.scrollHeight <= innerHeight + 1,
    })),
  ).toEqual({ width: true, height: true });
};

test("the new world renders local 3D artwork and navigates without a document scroll", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("CODE.");
  await expect(page).toHaveTitle("syntaxticsugr — Aditya Raj");
  await expect(page.locator(".mini-world__canvas")).toBeVisible();
  await expect(navigation(page).getByRole("button")).toHaveCount(6);
  await page.getByRole("button", { name: "Take a look around" }).click();
  await expect(page).toHaveURL(/#work$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "From zero.To shipped.",
  );
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "CURIOSITY.",
  );
  await fits(page);
  expect(errors).toEqual([]);
});

test("the island can be turned and its projected places open real destinations", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".mini-world__canvas")).toBeVisible();
  await expect(
    page.getByText("DRAG TO TURN THE WORLD", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await page.waitForTimeout(350);
  const canvas = page.locator(".mini-world__canvas");
  const before = await canvas.screenshot();
  const rect = (await canvas.boundingBox())!;
  await page.mouse.move(rect.x + rect.width * 0.75, rect.y + rect.height * 0.8);
  await page.mouse.down();
  await page.mouse.move(
    rect.x + rect.width * 0.53,
    rect.y + rect.height * 0.8,
    { steps: 15 },
  );
  await page.mouse.up();
  await page.waitForTimeout(1100);
  expect((await canvas.screenshot()).equals(before)).toBe(false);
  await expect(page).not.toHaveURL(/#work/);
  await page
    .locator(".mini-world__label")
    .filter({ hasText: "EXPERIENCE" })
    .click();
  await expect(page).toHaveURL(/#work$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "From zero. To shipped." }),
  ).toBeVisible();
});

test("experience preserves the actual jobs and contextual outcomes", async ({
  page,
}) => {
  await page.goto("/#work");
  await page.getByRole("button", { name: /HeyTheo NOW/ }).click();
  await expect(
    page.getByRole("heading", { name: "First engineer. Whole product." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /MUZEE.AI PREVIOUS/ }).click();
  await expect(
    page.getByRole("heading", { name: "Giving silent video its sound." }),
  ).toBeVisible();
  await expect(
    page.getByText("Model deployment time", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Backend operating costs", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".job-metrics")).toContainText("95%");
  await expect(page.locator(".job-metrics")).toContainText("90%");
  await page.getByText("The engineering behind it", { exact: false }).click();
  await expect(page.getByText("AI Intern · 2024-11 — 2025-01")).toBeVisible();
  await page.getByRole("button", { name: /Vediq NOW/ }).click();
  await expect(
    page.getByText("August 2026 — Present", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".job-story")).toContainText(
    "Founding Engineer at Vediq.",
  );
  await fits(page);
});

test("the university opens education with the actual institutions and degrees", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".mini-world__canvas")).toBeVisible();
  await page
    .locator(".mini-world__label")
    .filter({ hasText: "EDUCATION" })
    .click();
  await expect(page).toHaveURL(/#education$/);
  await expect(page).toHaveTitle("Education — syntaxticsugr");
  await expect(
    page.getByRole("heading", { level: 1, name: "Where it started." }),
  ).toBeVisible();
  const chapters = page
    .getByRole("list", { name: "Education history" })
    .getByRole("listitem");
  await expect(chapters).toHaveCount(3);
  await expect(chapters.nth(0)).toContainText("Chandigarh University");
  await expect(chapters.nth(0)).toContainText("Bachelor of Engineering (BE)");
  await expect(chapters.nth(0)).toContainText("Aug 2022 — Jun 2025");
  await expect(chapters.nth(0)).toContainText("Punjab, India");
  await expect(chapters.nth(1)).toContainText(
    "Punjab State Board of Technical Education and Industrial Training (PSBTE & IT)",
  );
  await expect(chapters.nth(1)).toContainText("High School Diploma");
  await expect(chapters.nth(1)).toContainText("Aug 2019 — Jun 2022");
  await expect(chapters.nth(1)).toContainText("Punjab, India");
  await expect(chapters.nth(0)).toContainText("Computer Science");
  await expect(chapters.nth(1)).toContainText("Computer Science");
  const school = chapters.nth(2);
  await expect(school).toContainText("Shishu Niketan");
  await expect(school).toContainText("Chandigarh, India");
  await expect(school).toContainText("Until 2019");
  await expect(school).toContainText("Class 10");
  await expect(school.locator("time")).toHaveCount(1);
  await expect(school.locator("time")).toHaveAttribute("datetime", "2019");
  await school.scrollIntoViewIfNeeded();
  await expect(school).toBeInViewport();
  await page.reload();
  await expect(page).toHaveTitle("Education — syntaxticsugr");
  await expect(
    navigation(page).getByRole("button", { name: "Education", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await fits(page);
});

test("the food court opens a scenic destination and returns to the world", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".mini-world__label")
    .filter({ hasText: "FOOD COURT" })
    .click();
  await expect(page).toHaveURL(/#food$/);
  await expect(page).toHaveTitle("Food court — syntaxticsugr");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Good food. Better company.",
    }),
  ).toBeVisible();
  await expect(page.locator(".mini-world__canvas")).toBeVisible();
  await expect(page.locator(".station-panel")).toHaveCount(0);
  await expect(navigation(page).getByRole("button")).toHaveCount(6);
  await expect(page.locator(".world-passport")).toContainText(
    "02 / 07 PLACES EXPLORED",
  );
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await page.waitForTimeout(1500);
  const canvas = page.locator(".mini-world__canvas");
  const before = await canvas.screenshot();
  const rect = (await canvas.boundingBox())!;
  await page.mouse.move(rect.x + rect.width * 0.8, rect.y + rect.height * 0.65);
  await page.mouse.down();
  await page.mouse.move(
    rect.x + rect.width * 0.6,
    rect.y + rect.height * 0.65,
    { steps: 15 },
  );
  await page.mouse.up();
  await page.waitForTimeout(1500);
  expect((await canvas.screenshot()).equals(before)).toBe(false);
  await expect(page).toHaveURL(/#food$/);
  await page.getByRole("button", { name: "BACK TO THE WORLD" }).click();
  await expect(page).toHaveURL(/#home$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("CODE.");
});

test("retired lab links return to the world and the guide includes education and the food court", async ({
  page,
}) => {
  for (const hash of ["lab", "approach"]) {
    await page.goto(`/#${hash}`);
    await expect(page).toHaveTitle("syntaxticsugr — Aditya Raj");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "CODE.",
    );
    await expect(navigation(page).getByRole("button")).toHaveCount(6);
    await expect(
      navigation(page).getByRole("button", { name: "The AI lab" }),
    ).toHaveCount(0);
  }
  await page
    .getByRole("button", { name: "Open world map", exact: true })
    .click();
  const map = page.getByRole("dialog", { name: "Where to?" });
  await expect(map.locator(".map-places > button")).toHaveCount(7);
  await expect(map).toContainText("Use keys 1–7 to jump between places.");
  await expect(map.getByRole("button", { name: /Education/ })).toHaveAttribute(
    "aria-keyshortcuts",
    "3",
  );
  await expect(map.getByRole("button", { name: /Food court/ })).toHaveAttribute(
    "aria-keyshortcuts",
    "7",
  );
  await page.keyboard.press("8");
  await expect(map).toBeVisible();
  await expect(page).toHaveTitle("syntaxticsugr — Aditya Raj");
});

test("ViPER is the sole GitHub project and its sound is explicitly controlled", async ({
  page,
}) => {
  await page.goto("/#viper");
  await expect(
    page.getByRole("link", { name: "Explore the collection" }),
  ).toHaveAttribute(
    "href",
    "https://github.com/syntaxticsugr/ViPER4Android-Presets",
  );
  await expect(page.locator('main a[href^="https://github.com/"]')).toHaveCount(
    1,
  );
  await expect(
    page.getByRole("button", { name: "Play sound", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Play sound", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause sound", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("slider", { name: "Sound brightness" }).fill("85");
  await page.getByRole("button", { name: "Pause sound", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play sound", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/CallerID|SlugLimes/)).toHaveCount(0);
});

test("cinema changes worlds and its complete archive searches and restores focus", async ({
  page,
}) => {
  await page.goto("/#anime");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Cowboy Bebop",
  );
  await page.getByRole("button", { name: "Next anime", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Attack on Titan",
  );
  await page
    .getByRole("button", { name: "Select Dandadan", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Dandadan",
  );
  const open = page.getByRole("button", { name: /All 105 entries/ });
  await open.click();
  const dialog = page.getByRole("dialog", { name: "The watchlist." });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("li")).toHaveCount(105);
  await dialog.getByRole("button", { name: /Completed\s*35/ }).click();
  await expect(dialog.locator("li")).toHaveCount(35);
  await dialog.getByRole("button", { name: /Ongoing\s*70/ }).click();
  await expect(dialog.locator("li")).toHaveCount(70);
  await dialog.getByRole("button", { name: /All\s*105/ }).click();
  await dialog.getByRole("searchbox").fill("Steins;Gate");
  await expect(dialog.locator("li")).toHaveCount(1);
  await dialog.getByRole("searchbox").fill("Edgerunners");
  await expect(dialog.locator("li")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(open).toBeFocused();
  await navigation(page)
    .getByRole("button", { name: "The world", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("CODE.");
});

test("map navigation, contact addresses, and clipboard feedback are usable", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open world map", exact: true })
    .click();
  const map = page.getByRole("dialog", { name: "Where to?" });
  await expect(map).toBeVisible();
  await map.getByRole("button", { name: /Say hello/ }).click();
  await expect(map).not.toBeVisible();
  await expect(page).toHaveURL(/#contact$/);
  for (const [name, url] of [
    ["GitHub", "https://github.com/syntaxticsugr"],
    ["LinkedIn", "https://www.linkedin.com/in/syntaxticsugr"],
    ["Telegram", "https://t.me/syntaxticsugr"],
    ["WhatsApp", "https://wa.me/syntaxticsugr"],
  ]) {
    await expect(
      page.locator("main").getByRole("link", { name: new RegExp(name) }),
    ).toHaveAttribute("href", url);
  }
  await expect(
    page.getByRole("link", { name: "syntaxticsugr@gmail.com", exact: true }),
  ).toHaveAttribute("href", "mailto:syntaxticsugr@gmail.com");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => undefined },
    }),
  );
  await page.getByRole("button", { name: /COPY EMAIL ADDRESS/ }).click();
  await expect(
    page.getByRole("button", { name: "COPIED", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/#home$/);
});

test("world map shortcuts open all seven destinations and close the guide, including the current place", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#work");
  const map = page.getByRole("dialog", { name: "Where to?" });
  for (const [key, station] of [
    ["2", "work"],
    ["1", "home"],
    ["3", "education"],
    ["4", "viper"],
    ["5", "anime"],
    ["6", "contact"],
    ["7", "food"],
  ]) {
    await page
      .getByRole("button", { name: "Open world map", exact: true })
      .click();
    await expect(map).toBeVisible();
    await page.keyboard.press(key);
    await expect(map).not.toBeVisible();
    await expect(page).toHaveURL(new RegExp(`#${station}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("world map shortcuts ignore modifiers and Escape closes only the guide", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#viper");
  await page
    .getByRole("button", { name: "Open world map", exact: true })
    .click();
  const map = page.getByRole("dialog", { name: "Where to?" });
  await expect(map).toBeVisible();
  for (const chord of ["Alt+2", "Control+2", "Meta+2", "Shift+2"]) {
    await page.keyboard.press(chord);
    await expect(map).toBeVisible();
    await expect(page).toHaveURL(/#viper$/);
  }
  await page.keyboard.press("Escape");
  await expect(map).not.toBeVisible();
  await expect(page).toHaveURL(/#viper$/);
  await page.keyboard.press("2");
  await expect(page).toHaveURL(/#work$/);
});

test("station shortcuts respect sliders, watchlist typing, and other modal controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/#viper");
  const brightness = page.getByRole("slider", { name: "Sound brightness" });
  await brightness.fill("45");
  await brightness.focus();
  await brightness.press("ArrowRight");
  await expect(brightness).toHaveValue("46");
  // Cross the delayed route-heading focus while this control is in use.
  await page.clock.runFor(200);
  await brightness.press("2");
  await expect(brightness).toBeFocused();
  await expect(brightness).toHaveValue("46");
  await expect(page).toHaveURL(/#viper$/);

  await page.getByRole("button", { name: "Play sound", exact: true }).focus();
  await page.keyboard.press("5");
  await expect(page).toHaveURL(/#anime$/);
  await page.getByRole("button", { name: /All 105 entries/ }).click();
  const archive = page.getByRole("dialog", { name: "The watchlist." });
  const search = archive.getByRole("searchbox", { name: "Search watchlist" });
  await search.pressSequentially("1234567");
  await expect(search).toHaveValue("1234567");
  await expect(archive).toBeVisible();
  await expect(page).toHaveURL(/#anime$/);

  const close = archive.getByRole("button", { name: "Close watchlist" });
  await close.focus();
  await close.press("2");
  await expect(close).toBeFocused();
  await expect(archive).toBeVisible();
  await expect(page).toHaveURL(/#anime$/);
});

test("the experience fits phones and supports reduced motion and WebGL fallback", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Reduced motion enabled" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Take a look around" }),
    ).toBeInViewport();
    for (const place of [
      "Experience",
      "Education",
      "Music",
      "Anime",
      "Say hello",
    ]) {
      await navigation(page)
        .getByRole("button", { name: place, exact: true })
        .click();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(
        navigation(page).getByRole("button", { name: place, exact: true }),
      ).toBeInViewport();
      await fits(page);
    }
    await page.getByRole("button", { name: "Open world map" }).click();
    await page
      .getByRole("dialog", { name: "Where to?" })
      .getByRole("button", { name: /Food court/ })
      .click();
    await expect(page).toHaveURL(/#food$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
    await expect(page.locator(".world-canvas-wrap")).toHaveCSS("opacity", "1");
    await expect(page.locator(".world-canvas-wrap")).toHaveCSS(
      "pointer-events",
      "auto",
    );
    await expect(page.locator(".station-panel")).toHaveCount(0);
    if (width <= 600) {
      const copy = (await page.locator(".food-court-copy").boundingBox())!;
      const canvas = (await page.locator(".world-canvas-wrap").boundingBox())!;
      expect(copy.y + copy.height).toBeLessThan(canvas.y);
    }
    await expect(
      page.getByRole("button", { name: "BACK TO THE WORLD" }),
    ).toBeInViewport();
    await fits(page);
  }
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type === "webgl" || type === "webgl2") return null;
      return original.apply(this, [type, ...args] as Parameters<
        typeof original
      >);
    } as typeof original;
  });
  await page.goto("/");
  await expect(page.locator(".mini-world__fallback")).toBeVisible();
  await navigation(page)
    .getByRole("button", { name: "Experience", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "From zero. To shipped." }),
  ).toBeVisible();
});

test("one saved theme follows every destination, dialog, and reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "syntaxticsugr home", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".journey")).toHaveAttribute("data-theme", "light");
  await page
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Switch to light theme", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  for (const destination of [
    "Experience",
    "Education",
    "Music",
    "Anime",
    "Say hello",
    "The world",
  ]) {
    await navigation(page)
      .getByRole("button", { name: destination, exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".journey")).toHaveAttribute(
      "data-theme",
      "dark",
    );
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  }
  await page.getByRole("button", { name: "Open world map" }).click();
  await page
    .getByRole("dialog", { name: "Where to?" })
    .getByRole("button", { name: /Food court/ })
    .click();
  await expect(page).toHaveURL(/#food$/);
  await expect(page.locator(".journey")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator(".journey")).toHaveAttribute("data-theme", "dark");
  await navigation(page)
    .getByRole("button", { name: "Anime", exact: true })
    .click();
  const cinema = page.locator(".cinema-scene");
  await expect(cinema).toHaveCSS("background-color", "rgb(21, 22, 25)");
  await page.getByRole("button", { name: /All 105 entries/ }).click();
  const archive = page.getByRole("dialog", { name: "The watchlist." });
  await expect(archive).toHaveCSS("color-scheme", "dark");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Switch to light theme", exact: true })
    .click();
  await expect(page).toHaveURL(/#anime$/);
  await expect(cinema).toHaveCSS("background-color", "rgb(238, 236, 229)");
  await page.getByRole("button", { name: /All 105 entries/ }).click();
  await expect(archive).toHaveCSS("color-scheme", "light");
  await page.keyboard.press("Escape");
  await navigation(page)
    .getByRole("button", { name: "The world", exact: true })
    .click();
  await expect(page.locator(".journey")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator(".journey")).toHaveAttribute("data-theme", "light");
  await expect(page).toHaveTitle("syntaxticsugr — Aditya Raj");
});

test("theme follows the initial system preference and stays usable with reduced motion on phones", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  await expect(page.locator(".journey")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".mini-world__canvas")).toBeVisible();
  const switcher = page.getByRole("button", {
    name: "Switch to light theme",
    exact: true,
  });
  await expect(switcher).toBeInViewport();
  await expect(
    page.getByRole("link", { name: "syntaxticsugr home" }),
  ).toBeInViewport();
  await switcher.click();
  await expect(page.locator(".journey")).toHaveAttribute("data-theme", "light");
  await expect(
    page.getByRole("button", { name: "Reduced motion enabled" }),
  ).toBeDisabled();
  await fits(page);
  await page.reload();
  await expect(page.locator(".journey")).toHaveAttribute("data-theme", "light");
  await page
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click();
  await navigation(page)
    .getByRole("button", { name: "Anime", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS(
    "opacity",
    "1",
  );
  await page
    .getByRole("button", { name: "Switch to light theme", exact: true })
    .click();
  await expect(page.locator(".cinema-scene")).toHaveCSS(
    "background-color",
    "rgb(238, 236, 229)",
  );
  await fits(page);
});

test("motion toggles never replay the hero entrance and paused destinations stay readable", async ({
  page,
}) => {
  await page.goto("/");
  const hero = page.locator(".home-copy");
  await expect(hero).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await hero.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .filter((animation) =>
          Number.isFinite(animation.effect?.getTiming().iterations),
        )
        .map((animation) => animation.finished),
    );
  });
  const baseline = (await hero.boundingBox())!;
  for (const buttonName of [
    "Pause animation",
    "Resume animation",
    "Pause animation",
    "Resume animation",
  ]) {
    await page.getByRole("button", { name: buttonName, exact: true }).click();
    const frames = await hero.evaluate(async (element) => {
      const result = [];
      for (let frame = 0; frame < 16; frame++) {
        await new Promise(requestAnimationFrame);
        const rect = element.getBoundingClientRect();
        result.push({
          x: rect.x,
          y: rect.y,
          opacity: getComputedStyle(element).opacity,
        });
      }
      return result;
    });
    for (const frame of frames) {
      expect(Math.abs(frame.y - baseline.y)).toBeLessThan(0.1);
      expect(Math.abs(frame.x - baseline.x)).toBeLessThan(0.1);
      expect(frame.opacity).toBe("1");
    }
  }
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await navigation(page)
    .getByRole("button", { name: "Experience", exact: true })
    .click();
  await expect(page.locator(".station-panel")).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: /MUZEE.AI PREVIOUS/ }).click();
  await expect(page.locator(".job-story")).toHaveCSS("opacity", "1");
  await navigation(page)
    .getByRole("button", { name: "Anime", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS(
    "opacity",
    "1",
  );
  await page.getByRole("button", { name: "Next anime", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS(
    "opacity",
    "1",
  );
  await page
    .getByRole("button", { name: "Resume animation", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS(
    "opacity",
    "1",
  );
});
