import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const storePath = path.join(process.cwd(), "data", "store.json");
const store = JSON.parse(await fs.readFile(storePath, "utf8"));

function isDescendingByDate(scores) {
  const sorted = [...scores].sort((left, right) => right.date.localeCompare(left.date));
  return JSON.stringify(sorted) === JSON.stringify(scores);
}

const subscribers = store.users.filter((user) => user.role === "subscriber");
assert.ok(subscribers.length >= 3, "Expected seeded subscriber accounts.");

subscribers.forEach((user) => {
  const uniqueDates = new Set(user.scores.map((entry) => entry.date));
  assert.equal(uniqueDates.size, user.scores.length, `${user.fullName} has duplicate score dates.`);
  assert.ok(user.scores.length <= 5, `${user.fullName} exceeds the five-score retention window.`);
  assert.ok(isDescendingByDate(user.scores), `${user.fullName} scores are not stored newest-first.`);

  user.scores.forEach((entry) => {
    assert.ok(Number.isInteger(entry.score), `${user.fullName} has a non-integer score.`);
    assert.ok(entry.score >= 1 && entry.score <= 45, `${user.fullName} has a score outside 1-45.`);
  });

  assert.ok(
    user.charitySelection.percentage >= store.settings.minimumCharityPercentage,
    `${user.fullName} is below the minimum charity contribution percentage.`
  );
});

const marchDraw = store.draws.find((draw) => draw.id === "draw_2026_03");
assert.ok(marchDraw, "Expected the March 2026 published draw seed.");
assert.equal(marchDraw.status, "published", "March draw should be published.");
assert.equal(marchDraw.tiers.match5.rolloverCents, 1567, "March draw jackpot rollover should remain unclaimed.");
assert.equal(marchDraw.tiers.match4.winners.length, 2, "March draw should have two four-match winners.");
assert.equal(marchDraw.tiers.match3.winners.length, 1, "March draw should have one three-match winner.");

const aprilDraw = store.draws.find((draw) => draw.id === "draw_2026_04");
assert.ok(aprilDraw, "Expected the April 2026 scheduled draw seed.");
assert.equal(aprilDraw.status, "scheduled", "April draw should be scheduled.");
assert.ok(aprilDraw.simulation, "April draw should include a saved simulation.");
assert.equal(new Set(aprilDraw.simulation.numbers).size, 5, "Simulation draw numbers must be unique.");
assert.ok(
  aprilDraw.simulation.numbers.every((value) => Number.isInteger(value) && value >= 1 && value <= 45),
  "Simulation draw numbers must stay within the Stableford range."
);

console.log("Validation passed.");
console.log(`Subscribers checked: ${subscribers.length}`);
console.log(`Published draws checked: ${store.draws.filter((draw) => draw.status === "published").length}`);
console.log(`Active charities: ${store.charities.filter((charity) => charity.active).length}`);

