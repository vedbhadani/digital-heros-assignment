import { randomUUID } from "crypto";

import { drawTierLabels, formatMoney } from "@/lib/display";
import {
  buildNotificationEmailHtml,
  emailDeliveryEnabled,
  paymentIntegrationEnabled,
  sendTransactionalEmail
} from "@/lib/integrations";
import { toPublicUser } from "@/lib/session";
import type {
  AdminAnalytics,
  AdminPayload,
  AppSettings,
  CharityRecord,
  DashboardPayload,
  DashboardWinnerSummary,
  Database,
  DonationRecord,
  DrawLogic,
  DrawRecord,
  DrawSimulation,
  DrawTierKey,
  DrawTierRecord,
  EmailNotification,
  PublicUserRecord,
  ScoreEntry,
  UserRecord,
  VerificationStatus,
  WinnerRecord
} from "@/lib/types";

export const drawTierSharePercentages: Record<DrawTierKey, number> = {
  match5: 40,
  match4: 35,
  match3: 25
};

const requiredScoreWindow = 5;
const minScore = 1;
const maxScore = 45;

export function sortScoresNewestFirst(scores: ScoreEntry[]): ScoreEntry[] {
  return [...scores].sort((left, right) => {
    if (left.date !== right.date) {
      return right.date.localeCompare(left.date);
    }
    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

export function validateScoreInput(date: string, score: number): void {
  if (!date) {
    throw new Error("A score date is required.");
  }
  if (!Number.isInteger(score) || score < minScore || score > maxScore) {
    throw new Error("Scores must be a whole number between 1 and 45.");
  }
}

export function addScoreToUser(user: UserRecord, date: string, score: number): ScoreEntry[] {
  validateScoreInput(date, score);

  if (user.scores.some((entry) => entry.date === date)) {
    throw new Error("Only one score entry is permitted per date.");
  }

  const timestamp = new Date().toISOString();
  const nextScores = sortScoresNewestFirst([
    ...user.scores,
    {
      id: randomUUID(),
      date,
      score,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ]).slice(0, requiredScoreWindow);

  user.scores = nextScores;
  return nextScores;
}

export function editScoreForUser(
  user: UserRecord,
  scoreId: string,
  date: string,
  score: number
): ScoreEntry[] {
  validateScoreInput(date, score);

  const existing = user.scores.find((entry) => entry.id === scoreId);
  if (!existing) {
    throw new Error("The selected score entry was not found.");
  }

  if (user.scores.some((entry) => entry.date === date && entry.id !== scoreId)) {
    throw new Error("Only one score entry is permitted per date.");
  }

  existing.date = date;
  existing.score = score;
  existing.updatedAt = new Date().toISOString();
  user.scores = sortScoresNewestFirst(user.scores).slice(0, requiredScoreWindow);
  return user.scores;
}

export function deleteScoreForUser(user: UserRecord, scoreId: string): ScoreEntry[] {
  user.scores = user.scores.filter((entry) => entry.id !== scoreId);
  return sortScoresNewestFirst(user.scores);
}

export function isActiveSubscriber(user: UserRecord): boolean {
  return user.role === "subscriber" && user.subscription.status === "active";
}

export function getMonthlyEquivalentCents(user: UserRecord, settings: AppSettings): number {
  const sourceAmount =
    user.subscription.amountCents ||
    (user.subscription.plan === "yearly" ? settings.yearlyPriceCents : settings.monthlyPriceCents);

  if (user.subscription.plan === "yearly") {
    return Math.round(sourceAmount / 12);
  }

  return sourceAmount;
}

export function getPrizePoolContributionCents(user: UserRecord, settings: AppSettings): number {
  if (!isActiveSubscriber(user)) {
    return 0;
  }

  return Math.round(
    (getMonthlyEquivalentCents(user, settings) * settings.defaultPrizePoolContributionPercentage) / 100
  );
}

export function getCharityContributionCents(user: UserRecord, settings: AppSettings): number {
  if (!isActiveSubscriber(user)) {
    return 0;
  }

  return Math.round((getMonthlyEquivalentCents(user, settings) * user.charitySelection.percentage) / 100);
}

function getActiveSubscribers(database: Database): UserRecord[] {
  return database.users.filter(isActiveSubscriber);
}

function getScoreNumberSet(user: UserRecord): Set<number> {
  return new Set(user.scores.map((entry) => entry.score));
}

function matchTierFromCount(matchCount: number): DrawTierKey | null {
  if (matchCount >= 5) {
    return "match5";
  }
  if (matchCount === 4) {
    return "match4";
  }
  if (matchCount === 3) {
    return "match3";
  }
  return null;
}

function createEmptyTier(tier: DrawTierKey): DrawTierRecord {
  return {
    amountEachCents: 0,
    poolCents: 0,
    rolloverCents: 0,
    rolloverEnabled: tier === "match5",
    sharePercentage: drawTierSharePercentages[tier],
    winners: []
  };
}

function createEmptyTiers(): Record<DrawTierKey, DrawTierRecord> {
  return {
    match3: createEmptyTier("match3"),
    match4: createEmptyTier("match4"),
    match5: createEmptyTier("match5")
  };
}

function getLatestPublishedDraw(database: Database): DrawRecord | null {
  return [...database.draws]
    .filter((draw) => draw.status === "published")
    .sort((left, right) => right.month.localeCompare(left.month))[0] ?? null;
}

function getUpcomingDraw(database: Database): DrawRecord | null {
  return [...database.draws]
    .filter((draw) => draw.status === "scheduled")
    .sort((left, right) => left.month.localeCompare(right.month))[0] ?? null;
}

function getPrizePoolCents(database: Database): number {
  return getActiveSubscribers(database).reduce((total, user) => {
    return total + getPrizePoolContributionCents(user, database.settings);
  }, 0);
}

function getFrequencyRanking(users: UserRecord[]): number[] {
  const counts = new Map<number, number>();

  users.forEach((user) => {
    user.scores.forEach((entry) => {
      counts.set(entry.score, (counts.get(entry.score) ?? 0) + 1);
    });
  });

  return [...counts.entries()]
    .sort((left, right) => {
      if (left[1] !== right[1]) {
        return right[1] - left[1];
      }
      return left[0] - right[0];
    })
    .map(([score]) => score);
}

function generateRandomNumbers(existing: number[] = []): number[] {
  const numbers = new Set(existing);

  while (numbers.size < 5) {
    numbers.add(Math.floor(Math.random() * 45) + 1);
  }

  return [...numbers].sort((left, right) => left - right);
}

export function generateDrawNumbers(database: Database, logic: DrawLogic): number[] {
  if (logic === "random") {
    return generateRandomNumbers();
  }

  const activeUsers = getActiveSubscribers(database);
  const ranked = getFrequencyRanking(activeUsers);
  const chosen: number[] = [];

  ranked.slice(0, 2).forEach((value) => {
    if (!chosen.includes(value)) {
      chosen.push(value);
    }
  });

  ranked
    .slice()
    .reverse()
    .slice(0, 2)
    .forEach((value) => {
      if (!chosen.includes(value)) {
        chosen.push(value);
      }
    });

  const medianCandidate = ranked[Math.floor(ranked.length / 2)];
  if (medianCandidate && !chosen.includes(medianCandidate)) {
    chosen.push(medianCandidate);
  }

  return generateRandomNumbers(chosen);
}

function createWinnerRecord(
  user: UserRecord,
  matchedNumbers: number[],
  amountCents: number,
  verificationStatus: VerificationStatus = "pending"
): WinnerRecord {
  return {
    id: randomUUID(),
    amountCents,
    matchedNumbers,
    paymentStatus: "pending",
    proofImage: null,
    proofSubmittedAt: null,
    reviewNotes: null,
    reviewedAt: null,
    userId: user.id,
    verificationStatus
  };
}

function buildSimulationFromTiers(
  executedAt: string,
  logic: DrawLogic,
  numbers: number[],
  tiers: Record<DrawTierKey, DrawTierRecord>
): DrawSimulation {
  return {
    executedAt,
    logic,
    notes:
      logic === "algorithmic"
        ? "Weighted toward the most and least frequent active-subscriber scores."
        : "Random lottery-style number generation.",
    numbers,
    tiers: {
      match3: {
        projectedAmountEachCents: tiers.match3.amountEachCents,
        projectedPoolCents: tiers.match3.poolCents,
        willRollOver: false,
        winnerIds: tiers.match3.winners.map((winner) => winner.userId)
      },
      match4: {
        projectedAmountEachCents: tiers.match4.amountEachCents,
        projectedPoolCents: tiers.match4.poolCents,
        willRollOver: false,
        winnerIds: tiers.match4.winners.map((winner) => winner.userId)
      },
      match5: {
        projectedAmountEachCents: tiers.match5.amountEachCents,
        projectedPoolCents: tiers.match5.poolCents,
        willRollOver: tiers.match5.rolloverCents > 0,
        winnerIds: tiers.match5.winners.map((winner) => winner.userId)
      }
    }
  };
}

function evaluateDraw(
  database: Database,
  numbers: number[],
  rolloverFromPreviousCents: number
): {
  activeSubscriberCount: number;
  prizePoolCents: number;
  tiers: Record<DrawTierKey, DrawTierRecord>;
} {
  const activeUsers = getActiveSubscribers(database);
  const prizePoolCents = getPrizePoolCents(database);
  const tiers = createEmptyTiers();

  activeUsers.forEach((user) => {
    const userNumbers = getScoreNumberSet(user);
    const matchedNumbers = numbers.filter((number) => userNumbers.has(number));
    const tier = matchTierFromCount(matchedNumbers.length);

    if (!tier) {
      return;
    }

    tiers[tier].winners.push(createWinnerRecord(user, matchedNumbers, 0));
  });

  (Object.keys(tiers) as DrawTierKey[]).forEach((tier) => {
    const sharePercentage = drawTierSharePercentages[tier];
    const basePool = Math.round((prizePoolCents * sharePercentage) / 100);
    const poolCents = tier === "match5" ? basePool + rolloverFromPreviousCents : basePool;
    const winners = tiers[tier].winners;
    const amountEachCents = winners.length > 0 ? Math.floor(poolCents / winners.length) : 0;
    const rolloverCents = tier === "match5" && winners.length === 0 ? poolCents : 0;

    tiers[tier] = {
      ...tiers[tier],
      amountEachCents,
      poolCents,
      rolloverCents,
      winners: winners.map((winner) => ({
        ...winner,
        amountCents: amountEachCents
      }))
    };
  });

  return {
    activeSubscriberCount: activeUsers.length,
    prizePoolCents,
    tiers
  };
}

export function createNotification(
  database: Database,
  notification: Omit<EmailNotification, "createdAt" | "id" | "status">
): void {
  const record: EmailNotification = {
    ...notification,
    createdAt: new Date().toISOString(),
    id: randomUUID(),
    status: "sent"
  };

  database.notifications.unshift(record);

  if (notification.userId) {
    const recipient = database.users.find((user) => user.id === notification.userId);
    if (recipient) {
      void sendTransactionalEmail({
        html: buildNotificationEmailHtml(record.subject, record.preview, record.body),
        subject: record.subject,
        text: `${record.preview}\n\n${record.body}`,
        to: recipient.email
      }).catch(() => {
        // Delivery failures should not block core product flows in the assignment runtime.
      });
    }
  }
}

function getNextMonthKey(monthKey: string): string {
  const [yearValue, monthValue] = monthKey.split("-").map(Number);
  const nextMonth = monthValue === 12 ? 1 : monthValue + 1;
  const nextYear = monthValue === 12 ? yearValue + 1 : yearValue;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

function createScheduledDraw(month: string): DrawRecord {
  return {
    activeSubscriberCount: 0,
    createdAt: new Date().toISOString(),
    id: randomUUID(),
    label: new Date(`${month}-01T00:00:00Z`).toLocaleString("en-US", {
      month: "long",
      timeZone: "UTC",
      year: "numeric"
    }),
    logic: "algorithmic",
    month,
    notes: "Ready for admin simulation or publication.",
    numbers: [],
    prizePoolCents: 0,
    publishedAt: null,
    rolloverFromPreviousCents: 0,
    simulation: null,
    status: "scheduled",
    tiers: createEmptyTiers()
  };
}

export function runDraw(database: Database, logic: DrawLogic, simulate: boolean): DrawRecord {
  const scheduledDraw = getUpcomingDraw(database);
  if (!scheduledDraw) {
    throw new Error("No scheduled draw is available.");
  }

  const rolloverFromPreviousCents = getLatestPublishedDraw(database)?.tiers.match5.rolloverCents ?? 0;
  const numbers = generateDrawNumbers(database, logic);
  const outcome = evaluateDraw(database, numbers, rolloverFromPreviousCents);
  const simulation = buildSimulationFromTiers(new Date().toISOString(), logic, numbers, outcome.tiers);

  if (simulate) {
    scheduledDraw.logic = logic;
    scheduledDraw.prizePoolCents = outcome.prizePoolCents;
    scheduledDraw.activeSubscriberCount = outcome.activeSubscriberCount;
    scheduledDraw.rolloverFromPreviousCents = rolloverFromPreviousCents;
    scheduledDraw.simulation = simulation;
    scheduledDraw.notes = simulation.notes;
    return scheduledDraw;
  }

  scheduledDraw.logic = logic;
  scheduledDraw.numbers = numbers;
  scheduledDraw.prizePoolCents = outcome.prizePoolCents;
  scheduledDraw.activeSubscriberCount = outcome.activeSubscriberCount;
  scheduledDraw.rolloverFromPreviousCents = rolloverFromPreviousCents;
  scheduledDraw.publishedAt = new Date().toISOString();
  scheduledDraw.status = "published";
  scheduledDraw.tiers = outcome.tiers;
  scheduledDraw.notes =
    logic === "algorithmic"
      ? "Published using the weighted score-frequency draw engine."
      : "Published using the random lottery-style draw engine.";

  const activeUsers = getActiveSubscribers(database);

  activeUsers.forEach((user) => {
    createNotification(database, {
      audience: "user",
      body: `${scheduledDraw.label} results are live. Log in to review the draw numbers and your status.`,
      preview: "Monthly draw results are available now.",
      subject: `${scheduledDraw.label} draw results`,
      type: "draw",
      userId: user.id
    });
  });

  (Object.keys(scheduledDraw.tiers) as DrawTierKey[]).forEach((tier) => {
    scheduledDraw.tiers[tier].winners.forEach((winner) => {
      createNotification(database, {
        audience: "user",
        body: `You have a ${drawTierLabels[tier]} result in ${scheduledDraw.label}. Upload your proof to move to payout.`,
        preview: `You won ${formatMoney(winner.amountCents, database.settings.currencyCode)} in the ${drawTierLabels[tier]} tier.`,
        subject: `Winner alert: ${scheduledDraw.label}`,
        type: "winner",
        userId: winner.userId
      });
    });
  });

  const nextMonth = getNextMonthKey(scheduledDraw.month);
  if (!database.draws.some((draw) => draw.month === nextMonth)) {
    database.draws.push(createScheduledDraw(nextMonth));
  }

  return scheduledDraw;
}

function buildDashboardWinnings(draws: DrawRecord[], userId: string): DashboardWinnerSummary[] {
  const results: DashboardWinnerSummary[] = [];

  draws.forEach((draw) => {
    (Object.keys(draw.tiers) as DrawTierKey[]).forEach((tier) => {
      draw.tiers[tier].winners
        .filter((winner) => winner.userId === userId)
        .forEach((winner) => {
          results.push({
            amountCents: winner.amountCents,
            drawId: draw.id,
            drawLabel: draw.label,
            drawMonth: draw.month,
            matchedNumbers: winner.matchedNumbers,
            numbers: draw.numbers,
            paymentStatus: winner.paymentStatus,
            proofImage: winner.proofImage,
            proofSubmittedAt: winner.proofSubmittedAt,
            tier,
            verificationStatus: winner.verificationStatus
          });
        });
    });
  });

  return results.sort((left, right) => right.drawMonth.localeCompare(left.drawMonth));
}

function getDrawsEntered(draws: DrawRecord[]): number {
  return draws.filter((draw) => draw.status === "published").length;
}

function getUserIndependentDonationCents(database: Database, userId: string): number {
  return database.donations
    .filter((donation) => donation.status === "paid" && donation.subscriberUserId === userId)
    .reduce((total, donation) => total + donation.amountCents, 0);
}

function getIndependentDonationCents(database: Database): number {
  return database.donations
    .filter((donation) => donation.status === "paid")
    .reduce((total, donation) => total + donation.amountCents, 0);
}

export function buildDashboardPayload(database: Database, userId: string): DashboardPayload {
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!user) {
    throw new Error("User not found.");
  }

  const publishedDraws = database.draws.filter((draw) => draw.status === "published");
  const winnings = buildDashboardWinnings(publishedDraws, userId);
  const latestPublishedDraw = getLatestPublishedDraw(database);
  const upcomingDraw = getUpcomingDraw(database);
  const notifications = database.notifications
    .filter((notification) => notification.userId === userId || notification.userId === null)
    .slice(0, 8);
  const scoreValues = user.scores.map((entry) => entry.score);
  const totalWonCents = winnings.reduce((total, item) => total + item.amountCents, 0);
  const donations = database.donations
    .filter((donation) => donation.subscriberUserId === user.id || donation.donorEmail === user.email)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 8);

  return {
    bestScore: scoreValues.length ? Math.max(...scoreValues) : null,
    charities: database.charities.filter((charity) => charity.active),
    charityContributionCents: getCharityContributionCents(user, database.settings),
    donations,
    drawsEntered: getDrawsEntered(publishedDraws),
    emailDeliveryEnabled: emailDeliveryEnabled(),
    independentDonationTotalCents: getUserIndependentDonationCents(database, user.id),
    latestPublishedDraw,
    notifications,
    paymentIntegrationEnabled: paymentIntegrationEnabled(),
    scoreAverage: scoreValues.length
      ? Number((scoreValues.reduce((total, value) => total + value, 0) / scoreValues.length).toFixed(1))
      : 0,
    settings: database.settings,
    totalWonCents,
    upcomingDraw,
    viewer: toPublicUser(user),
    winnings
  };
}

function buildAdminAnalytics(database: Database): AdminAnalytics {
  const subscriberUsers = database.users.filter((user) => user.role === "subscriber");
  const publishedDraws = database.draws.filter((draw) => draw.status === "published");
  const totalPaidOutCents = publishedDraws.reduce((total, draw) => {
    return (
      total +
      (Object.keys(draw.tiers) as DrawTierKey[]).reduce((tierTotal, tier) => {
        return tierTotal + draw.tiers[tier].winners.reduce((winnerTotal, winner) => winnerTotal + winner.amountCents, 0);
      }, 0)
    );
  }, 0);

  return {
    activeSubscribers: subscriberUsers.filter((user) => user.subscription.status === "active").length,
    charityContributionCents: subscriberUsers.reduce((total, user) => {
      return total + getCharityContributionCents(user, database.settings);
    }, 0),
    independentDonationCents: getIndependentDonationCents(database),
    inactiveSubscribers: subscriberUsers.filter((user) => user.subscription.status !== "active").length,
    publishedDrawCount: publishedDraws.length,
    rolloverCents: publishedDraws.reduce((total, draw) => total + draw.tiers.match5.rolloverCents, 0),
    totalPaidOutCents,
    totalCharityImpactCents:
      subscriberUsers.reduce((total, user) => {
        return total + getCharityContributionCents(user, database.settings);
      }, 0) + getIndependentDonationCents(database),
    totalPrizePoolCents: publishedDraws.reduce((total, draw) => total + draw.prizePoolCents, 0),
    totalUsers: database.users.length,
    verificationQueueCount: publishedDraws.reduce((total, draw) => {
      return (
        total +
        (Object.keys(draw.tiers) as DrawTierKey[]).reduce((tierTotal, tier) => {
          return (
            tierTotal +
            draw.tiers[tier].winners.filter(
              (winner) => winner.paymentStatus === "pending" || winner.verificationStatus === "pending"
            ).length
          );
        }, 0)
      );
    }, 0)
  };
}

export function buildAdminPayload(database: Database, adminId: string): AdminPayload {
  const admin = database.users.find((candidate) => candidate.id === adminId && candidate.role === "admin");
  if (!admin) {
    throw new Error("Admin user not found.");
  }

  return {
    admin: toPublicUser(admin),
    analytics: buildAdminAnalytics(database),
    charities: database.charities,
    donations: [...database.donations].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    draws: [...database.draws].sort((left, right) => right.month.localeCompare(left.month)),
    emailDeliveryEnabled: emailDeliveryEnabled(),
    notifications: database.notifications.slice(0, 12),
    paymentIntegrationEnabled: paymentIntegrationEnabled(),
    settings: database.settings,
    users: database.users.map((user) => toPublicUser(user)).sort((left, right) => left.fullName.localeCompare(right.fullName))
  };
}

export function getCharityById(charities: CharityRecord[], charityId: string): CharityRecord | undefined {
  return charities.find((charity) => charity.id === charityId);
}

export function updateCharitySelection(user: UserRecord, charityId: string, percentage: number, minimum: number): void {
  if (percentage < minimum) {
    throw new Error(`Charity contribution must be at least ${minimum}%.`);
  }

  user.charitySelection = {
    charityId,
    percentage
  };
}

export function updateUserProfile(
  user: UserRecord,
  input: {
    about?: string;
    country?: string;
    fullName?: string;
  }
): void {
  user.about = input.about?.trim() || user.about;
  user.country = input.country?.trim() || user.country;
  user.fullName = input.fullName?.trim() || user.fullName;
}

export function updateSubscription(
  user: UserRecord,
  plan: UserRecord["subscription"]["plan"],
  status: UserRecord["subscription"]["status"],
  settings: AppSettings
): void {
  user.subscription.plan = plan;
  user.subscription.status = status;
  user.subscription.amountCents = plan === "yearly" ? settings.yearlyPriceCents : settings.monthlyPriceCents;
  user.subscription.accessRestricted = status !== "active";
  user.subscription.cancelledAt = status === "cancelled" ? new Date().toISOString() : null;
  user.subscription.renewalDate =
    plan === "yearly"
      ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10)
      : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10);
}

export function createNewUserRecord(input: {
  about: string;
  charityId: string;
  country: string;
  email: string;
  fullName: string;
  passwordHash: string;
  percentage: number;
  plan: UserRecord["subscription"]["plan"];
  paymentProvider?: string;
  status?: UserRecord["subscription"]["status"];
  settings: AppSettings;
}): UserRecord {
  const now = new Date().toISOString();
  const renewalDate =
    input.plan === "yearly"
      ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10)
      : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10);

  return {
    about: input.about,
    charitySelection: {
      charityId: input.charityId,
      percentage: input.percentage
    },
    country: input.country,
    createdAt: now,
    email: input.email,
    fullName: input.fullName,
    id: randomUUID(),
    lastLoginAt: now,
    passwordHash: input.passwordHash,
    role: "subscriber",
    scores: [],
    subscription: {
      accessRestricted: (input.status || "active") !== "active",
      amountCents: input.plan === "yearly" ? input.settings.yearlyPriceCents : input.settings.monthlyPriceCents,
      cancelledAt: null,
      paymentProvider: input.paymentProvider || "stripe_mock",
      plan: input.plan,
      renewalDate,
      startedAt: now,
      status: input.status || "active"
    }
  };
}

export function assertSubscriberAccess(user: PublicUserRecord): void {
  if (user.subscription.status !== "active") {
    throw new Error("This action requires an active subscription.");
  }
}

export function createIndependentDonationRecord(input: {
  amountCents: number;
  charityId: string;
  checkoutReference?: string | null;
  checkoutUrl?: string | null;
  donorEmail: string;
  donorName: string;
  message?: string;
  paymentProvider: string;
  status: DonationRecord["status"];
  subscriberUserId?: string | null;
}): DonationRecord {
  return {
    amountCents: input.amountCents,
    charityId: input.charityId,
    checkoutReference: input.checkoutReference ?? null,
    checkoutUrl: input.checkoutUrl ?? null,
    createdAt: new Date().toISOString(),
    donorEmail: input.donorEmail,
    donorName: input.donorName,
    id: randomUUID(),
    message: input.message?.trim() || "",
    paidAt: input.status === "paid" ? new Date().toISOString() : null,
    paymentProvider: input.paymentProvider,
    status: input.status,
    subscriberUserId: input.subscriberUserId ?? null
  };
}
