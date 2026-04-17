export type UserRole = "subscriber" | "admin";
export type SubscriptionPlan = "monthly" | "yearly";
export type SubscriptionStatus = "active" | "inactive" | "cancelled" | "lapsed";
export type DrawLogic = "random" | "algorithmic";
export type DrawStatus = "scheduled" | "published";
export type DrawTierKey = "match5" | "match4" | "match3";
export type VerificationStatus = "pending" | "approved" | "rejected";
export type PaymentStatus = "pending" | "paid";
export type DonationStatus = "pending" | "paid" | "failed";

export interface ScoreEntry {
  id: string;
  date: string;
  score: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionRecord {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startedAt: string;
  renewalDate: string;
  cancelledAt: string | null;
  amountCents: number;
  paymentProvider: string;
  accessRestricted: boolean;
}

export interface CharitySelection {
  charityId: string;
  percentage: number;
}

export interface CharityEvent {
  id: string;
  title: string;
  date: string;
  venue: string;
}

export interface CharityRecord {
  id: string;
  slug: string;
  name: string;
  category: string;
  location: string;
  shortDescription: string;
  description: string;
  impactMetric: string;
  tags: string[];
  featured: boolean;
  spotlight: boolean;
  active: boolean;
  imageUrl: string;
  supportUrl: string;
  searchKeywords: string[];
  visual: {
    accent: string;
    glow: string;
    mesh: string;
  };
  events: CharityEvent[];
}

export interface DonationRecord {
  id: string;
  donorName: string;
  donorEmail: string;
  charityId: string;
  amountCents: number;
  message: string;
  status: DonationStatus;
  paymentProvider: string;
  checkoutUrl: string | null;
  checkoutReference: string | null;
  createdAt: string;
  paidAt: string | null;
  subscriberUserId: string | null;
}

export interface WinnerRecord {
  id: string;
  userId: string;
  matchedNumbers: number[];
  amountCents: number;
  verificationStatus: VerificationStatus;
  paymentStatus: PaymentStatus;
  proofImage: string | null;
  proofSubmittedAt: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

export interface DrawTierRecord {
  sharePercentage: number;
  poolCents: number;
  amountEachCents: number;
  rolloverEnabled: boolean;
  rolloverCents: number;
  winners: WinnerRecord[];
}

export interface DrawSimulationTier {
  winnerIds: string[];
  projectedPoolCents: number;
  projectedAmountEachCents: number;
  willRollOver: boolean;
}

export interface DrawSimulation {
  executedAt: string;
  logic: DrawLogic;
  numbers: number[];
  notes: string;
  tiers: Record<DrawTierKey, DrawSimulationTier>;
}

export interface DrawRecord {
  id: string;
  label: string;
  month: string;
  status: DrawStatus;
  logic: DrawLogic;
  numbers: number[];
  createdAt: string;
  publishedAt: string | null;
  activeSubscriberCount: number;
  prizePoolCents: number;
  rolloverFromPreviousCents: number;
  notes: string;
  tiers: Record<DrawTierKey, DrawTierRecord>;
  simulation: DrawSimulation | null;
}

export interface EmailNotification {
  id: string;
  userId: string | null;
  audience: "user" | "admin" | "system";
  type: "welcome" | "subscription" | "draw" | "winner" | "verification" | "system";
  subject: string;
  preview: string;
  body: string;
  status: "queued" | "sent";
  createdAt: string;
}

export interface UserRecord {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
  passwordHash: string;
  country: string;
  about: string;
  createdAt: string;
  lastLoginAt: string;
  charitySelection: CharitySelection;
  subscription: SubscriptionRecord;
  scores: ScoreEntry[];
}

export type PublicUserRecord = Omit<UserRecord, "passwordHash">;

export interface AppSettings {
  appName: string;
  currencyCode: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  minimumCharityPercentage: number;
  defaultPrizePoolContributionPercentage: number;
  nextOfficialDrawDate: string;
  supportedCountries: string[];
}

export interface Database {
  meta: {
    version: string;
    seededAt: string;
    updatedAt: string;
  };
  settings: AppSettings;
  charities: CharityRecord[];
  users: UserRecord[];
  draws: DrawRecord[];
  donations: DonationRecord[];
  notifications: EmailNotification[];
}

export interface DashboardWinnerSummary {
  drawId: string;
  drawLabel: string;
  drawMonth: string;
  tier: DrawTierKey;
  amountCents: number;
  paymentStatus: PaymentStatus;
  verificationStatus: VerificationStatus;
  proofImage: string | null;
  proofSubmittedAt: string | null;
  numbers: number[];
  matchedNumbers: number[];
}

export interface DashboardPayload {
  viewer: PublicUserRecord;
  settings: AppSettings;
  charities: CharityRecord[];
  latestPublishedDraw: DrawRecord | null;
  upcomingDraw: DrawRecord | null;
  winnings: DashboardWinnerSummary[];
  totalWonCents: number;
  charityContributionCents: number;
  independentDonationTotalCents: number;
  scoreAverage: number;
  bestScore: number | null;
  drawsEntered: number;
  donations: DonationRecord[];
  notifications: EmailNotification[];
  paymentIntegrationEnabled: boolean;
  emailDeliveryEnabled: boolean;
}

export interface AdminAnalytics {
  totalUsers: number;
  activeSubscribers: number;
  inactiveSubscribers: number;
  totalPrizePoolCents: number;
  totalPaidOutCents: number;
  charityContributionCents: number;
  independentDonationCents: number;
  totalCharityImpactCents: number;
  verificationQueueCount: number;
  publishedDrawCount: number;
  rolloverCents: number;
}

export interface AdminPayload {
  admin: PublicUserRecord;
  settings: AppSettings;
  users: PublicUserRecord[];
  charities: CharityRecord[];
  draws: DrawRecord[];
  donations: DonationRecord[];
  notifications: EmailNotification[];
  analytics: AdminAnalytics;
  paymentIntegrationEnabled: boolean;
  emailDeliveryEnabled: boolean;
}
