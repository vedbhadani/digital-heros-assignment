-- 1. Create the application state table
CREATE TABLE IF NOT EXISTS app_state (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy that allows only service_role (admin) to manage state
-- Since we are using getSupabaseAdmin() with the service_role key, 
-- it will bypass RLS, but this keeps the table secure from public anon keys.
CREATE POLICY "Admin only access" 
ON app_state 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 4. Initial Seed (Run this in your Supabase SQL Editor)
-- Replace the {} with the content of your local data/store.json if you want to migrate existing users/scores.
INSERT INTO app_state (id, payload)
VALUES ('global_state', '{
  "meta": {
    "version": "1.0.0",
    "seededAt": "2026-04-16T08:00:00.000Z",
    "updatedAt": "2026-04-16T08:00:00.000Z"
  },
  "settings": {
    "appName": "Fair Chance Club",
    "currencyCode": "USD",
    "monthlyPriceCents": 2900,
    "yearlyPriceCents": 29900,
    "minimumCharityPercentage": 10,
    "defaultPrizePoolContributionPercentage": 35,
    "nextOfficialDrawDate": "2026-04-30"
  },
  "charities": [
    {
      "id": "charity_youth_swing",
      "slug": "youth-swing-labs",
      "name": "Youth Swing Labs",
      "category": "Youth Development",
      "location": "Austin, Texas",
      "shortDescription": "Funds after-school golf confidence labs for young people who do not have regular club access.",
      "description": "Youth Swing Labs pairs junior golfers with mentors, travel support, and confidence-building practice sessions. Subscriptions help fund equipment grants, transportation, and tournament entry support for first-generation players.",
      "impactMetric": "128 junior golfers supported this season",
      "tags": ["Mentorship", "Travel grants", "After-school"],
      "featured": true,
      "spotlight": true,
      "active": true,
      "visual": {
        "accent": "#f6d88d",
        "glow": "rgba(246, 216, 141, 0.35)",
        "mesh": "linear-gradient(135deg, rgba(246,216,141,0.88), rgba(16,70,58,0.9))"
      },
      "events": [
        {
          "id": "event_youth_1",
          "title": "Sunrise Short-Game Clinic",
          "date": "2026-05-12",
          "venue": "Butler Pitch & Putt"
        },
        {
          "id": "event_youth_2",
          "title": "Confidence Nine-Hole Day",
          "date": "2026-06-06",
          "venue": "Lions Municipal"
        }
      ]
    },
    {
      "id": "charity_green_route",
      "slug": "green-route-foundation",
      "name": "Green Route Foundation",
      "category": "Community Access",
      "location": "Seattle, Washington",
      "shortDescription": "Builds public transport vouchers and free-range days into municipal golf access programs.",
      "description": "Green Route Foundation removes the access barriers that keep community golfers away from the course. Funding supports equipment libraries, transport vouchers, and inclusive club days hosted with public facilities.",
      "impactMetric": "2,400 transport rides funded for golfers in 2025",
      "tags": ["Access", "Public courses", "Transport"],
      "featured": true,
      "spotlight": false,
      "active": true,
      "visual": {
        "accent": "#80f7ba",
        "glow": "rgba(128, 247, 186, 0.28)",
        "mesh": "linear-gradient(135deg, rgba(15,59,47,1), rgba(128,247,186,0.85))"
      },
      "events": [
        {
          "id": "event_route_1",
          "title": "Community Golf Day",
          "date": "2026-05-22",
          "venue": "Jackson Park"
        }
      ]
    },
    {
      "id": "charity_well_mind",
      "slug": "well-mind-fairways",
      "name": "Well Mind Fairways",
      "category": "Mental Health",
      "location": "Denver, Colorado",
      "shortDescription": "Uses golf routines and small-group support to improve mental wellbeing for young adults.",
      "description": "Well Mind Fairways blends low-pressure golf practice with therapist-guided resilience sessions. Support from players underwrites group programs, coaching, and bursaries for participants coming through recovery pathways.",
      "impactMetric": "83 bursary-supported wellness places funded",
      "tags": ["Mental health", "Recovery", "Coaching"],
      "featured": false,
      "spotlight": false,
      "active": true,
      "visual": {
        "accent": "#ff8f66",
        "glow": "rgba(255, 143, 102, 0.26)",
        "mesh": "linear-gradient(135deg, rgba(255,143,102,0.85), rgba(45,26,25,0.92))"
      },
      "events": [
        {
          "id": "event_well_1",
          "title": "Nine Holes, One Breath",
          "date": "2026-05-30",
          "venue": "City Park Golf Course"
        }
      ]
    },
    {
      "id": "charity_tide_reach",
      "slug": "tide-reach-sport-fund",
      "name": "Tide Reach Sport Fund",
      "category": "Girls in Sport",
      "location": "Miami, Florida",
      "shortDescription": "Sponsors girls-led golf days, leadership workshops, and beginner tournament pathways.",
      "description": "Tide Reach Sport Fund creates safe, stylish, high-energy sports spaces for teenage girls. Their golf work focuses on summer camps, leadership circles, tournament scholarships, and confidence-led coaching journeys.",
      "impactMetric": "14 all-girls golf days delivered last quarter",
      "tags": ["Leadership", "Girls in sport", "Scholarships"],
      "featured": true,
      "spotlight": false,
      "active": true,
      "visual": {
        "accent": "#a9c6ff",
        "glow": "rgba(169, 198, 255, 0.28)",
        "mesh": "linear-gradient(135deg, rgba(169,198,255,0.9), rgba(26,41,72,0.95))"
      },
      "events": [
        {
          "id": "event_tide_1",
          "title": "Beachside Beginners Classic",
          "date": "2026-06-14",
          "venue": "Crandon Golf"
        }
      ]
    }
  ],
  "users": [
    {
      "id": "user_admin_1",
      "role": "admin",
      "fullName": "Maya Chen",
      "email": "admin@fairchance.club",
      "passwordHash": "29ca5dbd692df2061b97649465d44835:6ad5665892c93f96230f87587b5b211f7951f76c774806a7f54c1d27c6e62e26cfd8bd2e43f46775fedc70a19a2c7cd31416551776a7b10baf7bd469e85e9b05",
      "country": "United States",
      "about": "Product and operations lead for the assignment environment.",
      "createdAt": "2026-01-05T09:00:00.000Z",
      "lastLoginAt": "2026-04-16T07:45:00.000Z",
      "charitySelection": {
        "charityId": "charity_youth_swing",
        "percentage": 10
      },
      "subscription": {
        "plan": "yearly",
        "status": "active",
        "startedAt": "2026-01-05T09:00:00.000Z",
        "renewalDate": "2027-01-05",
        "cancelledAt": null,
        "amountCents": 29900,
        "paymentProvider": "stripe_mock",
        "accessRestricted": false
      },
      "scores": []
    },
    {
      "id": "user_sub_1",
      "role": "subscriber",
      "fullName": "Sophie Bennett",
      "email": "sophie@fairchance.club",
      "passwordHash": "3ad252dbc41a69f0854a6406d74655e4:131a87fbd3ebe0deeb365b02c665af724bbe97baf96d8de3e0d617009ead3556e7b345a3896716e46182c01094efdd5df0a718e2dd7ec391dd379dbe89e2c508",
      "country": "United States",
      "about": "Weekend golfer who chose Fair Chance for the charity-first mission.",
      "createdAt": "2026-02-01T11:00:00.000Z",
      "lastLoginAt": "2026-04-15T19:10:00.000Z",
      "charitySelection": {
        "charityId": "charity_youth_swing",
        "percentage": 18
      },
      "subscription": {
        "plan": "monthly",
        "status": "active",
        "startedAt": "2026-02-01T11:00:00.000Z",
        "renewalDate": "2026-05-01",
        "cancelledAt": null,
        "amountCents": 2900,
        "paymentProvider": "stripe_mock",
        "accessRestricted": false
      },
      "scores": [
        {
          "id": "score_sophie_1",
          "date": "2026-04-15",
          "score": 34,
          "createdAt": "2026-04-15T18:20:00.000Z",
          "updatedAt": "2026-04-15T18:20:00.000Z"
        },
        {
          "id": "score_sophie_2",
          "date": "2026-04-05",
          "score": 29,
          "createdAt": "2026-04-05T18:20:00.000Z",
          "updatedAt": "2026-04-05T18:20:00.000Z"
        },
        {
          "id": "score_sophie_3",
          "date": "2026-03-28",
          "score": 31,
          "createdAt": "2026-03-28T18:20:00.000Z",
          "updatedAt": "2026-03-28T18:20:00.000Z"
        },
        {
          "id": "score_sophie_4",
          "date": "2026-03-14",
          "score": 27,
          "createdAt": "2026-03-14T18:20:00.000Z",
          "updatedAt": "2026-03-14T18:20:00.000Z"
        },
        {
          "id": "score_sophie_5",
          "date": "2026-03-02",
          "score": 33,
          "createdAt": "2026-03-02T18:20:00.000Z",
          "updatedAt": "2026-03-02T18:20:00.000Z"
        }
      ]
    },
    {
      "id": "user_sub_2",
      "role": "subscriber",
      "fullName": "Riley Morgan",
      "email": "riley@fairchance.club",
      "passwordHash": "c5132d5b276d1ea40b8c390c09c0c33f:760f72881f5bc63ea91bfee34333a227157f5e0035d68c4f018ba9bd6a3f5f06da654879616ad527dc654294b00195fccc2c3f3de23341b1b289cf034a40f092",
      "country": "United States",
      "about": "Data-minded subscriber testing the yearly plan and draw engine.",
      "createdAt": "2026-01-10T13:00:00.000Z",
      "lastLoginAt": "2026-04-14T13:40:00.000Z",
      "charitySelection": {
        "charityId": "charity_green_route",
        "percentage": 22
      },
      "subscription": {
        "plan": "yearly",
        "status": "active",
        "startedAt": "2026-01-10T13:00:00.000Z",
        "renewalDate": "2027-01-10",
        "cancelledAt": null,
        "amountCents": 29900,
        "paymentProvider": "stripe_mock",
        "accessRestricted": false
      },
      "scores": [
        {
          "id": "score_riley_1",
          "date": "2026-04-12",
          "score": 30,
          "createdAt": "2026-04-12T12:10:00.000Z",
          "updatedAt": "2026-04-12T12:10:00.000Z"
        },
        {
          "id": "score_riley_2",
          "date": "2026-04-01",
          "score": 33,
          "createdAt": "2026-04-01T12:10:00.000Z",
          "updatedAt": "2026-04-01T12:10:00.000Z"
        },
        {
          "id": "score_riley_3",
          "date": "2026-03-21",
          "score": 35,
          "createdAt": "2026-03-21T12:10:00.000Z",
          "updatedAt": "2026-03-21T12:10:00.000Z"
        },
        {
          "id": "score_riley_4",
          "date": "2026-03-08",
          "score": 29,
          "createdAt": "2026-03-08T12:10:00.000Z",
          "updatedAt": "2026-03-08T12:10:00.000Z"
        },
        {
          "id": "score_riley_5",
          "date": "2026-02-27",
          "score": 31,
          "createdAt": "2026-02-27T12:10:00.000Z",
          "updatedAt": "2026-02-27T12:10:00.000Z"
        }
      ]
    },
    {
      "id": "user_sub_3",
      "role": "subscriber",
      "fullName": "June Alvarez",
      "email": "june@fairchance.club",
      "passwordHash": "13e460c6abf7b327824b1ffc897c80b2:8c2bab3381f317ad666b00a733b622204ee0019d20ab4c95ef54744bd7108d000df37a9a82a176f38f5d5bb76b54ceeb903a3309e6154b3e019de5c136fa270c",
      "country": "United States",
      "about": "Paused account used to demonstrate lapsed access restrictions.",
      "createdAt": "2026-02-14T08:00:00.000Z",
      "lastLoginAt": "2026-04-08T09:15:00.000Z",
      "charitySelection": {
        "charityId": "charity_well_mind",
        "percentage": 12
      },
      "subscription": {
        "plan": "monthly",
        "status": "lapsed",
        "startedAt": "2026-02-14T08:00:00.000Z",
        "renewalDate": "2026-04-14",
        "cancelledAt": null,
        "amountCents": 2900,
        "paymentProvider": "stripe_mock",
        "accessRestricted": true
      },
      "scores": [
        {
          "id": "score_june_1",
          "date": "2026-04-02",
          "score": 28,
          "createdAt": "2026-04-02T08:20:00.000Z",
          "updatedAt": "2026-04-02T08:20:00.000Z"
        },
        {
          "id": "score_june_2",
          "date": "2026-03-24",
          "score": 26,
          "createdAt": "2026-03-24T08:20:00.000Z",
          "updatedAt": "2026-03-24T08:20:00.000Z"
        },
        {
          "id": "score_june_3",
          "date": "2026-03-11",
          "score": 32,
          "createdAt": "2026-03-11T08:20:00.000Z",
          "updatedAt": "2026-03-11T08:20:00.000Z"
        },
        {
          "id": "score_june_4",
          "date": "2026-02-28",
          "score": 30,
          "createdAt": "2026-02-28T08:20:00.000Z",
          "updatedAt": "2026-02-28T08:20:00.000Z"
        },
        {
          "id": "score_june_5",
          "date": "2026-02-18",
          "score": 29,
          "createdAt": "2026-02-18T08:20:00.000Z",
          "updatedAt": "2026-02-18T08:20:00.000Z"
        }
      ]
    },
    {
      "id": "user_sub_4",
      "role": "subscriber",
      "fullName": "Nina Patel",
      "email": "nina@fairchance.club",
      "passwordHash": "3ad252dbc41a69f0854a6406d74655e4:131a87fbd3ebe0deeb365b02c665af724bbe97baf96d8de3e0d617009ead3556e7b345a3896716e46182c01094efdd5df0a718e2dd7ec391dd379dbe89e2c508",
      "country": "United States",
      "about": "Community golfer using the monthly plan to support girls-in-sport programming.",
      "createdAt": "2026-03-01T14:00:00.000Z",
      "lastLoginAt": "2026-04-13T16:00:00.000Z",
      "charitySelection": {
        "charityId": "charity_tide_reach",
        "percentage": 15
      },
      "subscription": {
        "plan": "monthly",
        "status": "active",
        "startedAt": "2026-03-01T14:00:00.000Z",
        "renewalDate": "2026-05-01",
        "cancelledAt": null,
        "amountCents": 2900,
        "paymentProvider": "stripe_mock",
        "accessRestricted": false
      },
      "scores": [
        {
          "id": "score_nina_1",
          "date": "2026-04-10",
          "score": 28,
          "createdAt": "2026-04-10T15:00:00.000Z",
          "updatedAt": "2026-04-10T15:00:00.000Z"
        },
        {
          "id": "score_nina_2",
          "date": "2026-04-03",
          "score": 31,
          "createdAt": "2026-04-03T15:00:00.000Z",
          "updatedAt": "2026-04-03T15:00:00.000Z"
        },
        {
          "id": "score_nina_3",
          "date": "2026-03-22",
          "score": 34,
          "createdAt": "2026-03-22T15:00:00.000Z",
          "updatedAt": "2026-03-22T15:00:00.000Z"
        },
        {
          "id": "score_nina_4",
          "date": "2026-03-07",
          "score": 30,
          "createdAt": "2026-03-07T15:00:00.000Z",
          "updatedAt": "2026-03-07T15:00:00.000Z"
        },
        {
          "id": "score_nina_5",
          "date": "2026-02-25",
          "score": 29,
          "createdAt": "2026-02-25T15:00:00.000Z",
          "updatedAt": "2026-02-25T15:00:00.000Z"
        }
      ]
    }
  ],
  "draws": [
    {
      "id": "draw_2026_03",
      "label": "March 2026",
      "month": "2026-03",
      "status": "published",
      "logic": "random",
      "numbers": [29, 31, 33, 34, 35],
      "createdAt": "2026-03-01T00:00:00.000Z",
      "publishedAt": "2026-03-31T20:00:00.000Z",
      "activeSubscriberCount": 4,
      "prizePoolCents": 3917,
      "rolloverFromPreviousCents": 0,
      "notes": "Random monthly draw published after simulation review.",
      "tiers": {
        "match5": {
          "sharePercentage": 40,
          "poolCents": 1567,
          "amountEachCents": 0,
          "rolloverEnabled": true,
          "rolloverCents": 1567,
          "winners": []
        },
        "match4": {
          "sharePercentage": 35,
          "poolCents": 1371,
          "amountEachCents": 685,
          "rolloverEnabled": false,
          "rolloverCents": 0,
          "winners": [
            {
              "id": "winner_march_sophie",
              "userId": "user_sub_1",
              "matchedNumbers": [29, 31, 33, 34],
              "amountCents": 685,
              "verificationStatus": "approved",
              "paymentStatus": "paid",
              "proofImage": "data:image/svg+xml,%3Csvg xmlns=''http://www.w3.org/2000/svg'' width=''640'' height=''360'' viewBox=''0 0 640 360''%3E%3Crect width=''640'' height=''360'' fill=''%230d3b32''/%3E%3Ctext x=''40'' y=''80'' fill=''white'' font-size=''28''%3EStableford Proof%3C/text%3E%3Ctext x=''40'' y=''140'' fill=''%23f6d88d'' font-size=''22''%3ESophie Bennett%3C/text%3E%3Ctext x=''40'' y=''190'' fill=''white'' font-size=''18''%3ERound score 34 submitted%3C/text%3E%3C/svg%3E",
              "proofSubmittedAt": "2026-04-01T08:00:00.000Z",
              "reviewedAt": "2026-04-02T10:20:00.000Z",
              "reviewNotes": "Verified against score history and marked paid."
            },
            {
              "id": "winner_march_riley",
              "userId": "user_sub_2",
              "matchedNumbers": [29, 31, 33, 35],
              "amountCents": 685,
              "verificationStatus": "pending",
              "paymentStatus": "pending",
              "proofImage": null,
              "proofSubmittedAt": null,
              "reviewedAt": null,
              "reviewNotes": null
            }
          ]
        },
        "match3": {
          "sharePercentage": 25,
          "poolCents": 979,
          "amountEachCents": 979,
          "rolloverEnabled": false,
          "rolloverCents": 0,
          "winners": [
            {
              "id": "winner_march_nina",
              "userId": "user_sub_4",
              "matchedNumbers": [29, 31, 34],
              "amountCents": 979,
              "verificationStatus": "pending",
              "paymentStatus": "pending",
              "proofImage": null,
              "proofSubmittedAt": null,
              "reviewedAt": null,
              "reviewNotes": null
            }
          ]
        }
      },
      "simulation": null
    },
    {
      "id": "draw_2026_04",
      "label": "April 2026",
      "month": "2026-04",
      "status": "scheduled",
      "logic": "algorithmic",
      "numbers": [],
      "createdAt": "2026-04-01T00:00:00.000Z",
      "publishedAt": null,
      "activeSubscriberCount": 3,
      "prizePoolCents": 2902,
      "rolloverFromPreviousCents": 1567,
      "notes": "Ready for admin simulation or publication.",
      "tiers": {
        "match5": {
          "sharePercentage": 40,
          "poolCents": 0,
          "amountEachCents": 0,
          "rolloverEnabled": true,
          "rolloverCents": 0,
          "winners": []
        },
        "match4": {
          "sharePercentage": 35,
          "poolCents": 0,
          "amountEachCents": 0,
          "rolloverEnabled": false,
          "rolloverCents": 0,
          "winners": []
        },
        "match3": {
          "sharePercentage": 25,
          "poolCents": 0,
          "amountEachCents": 0,
          "rolloverEnabled": false,
          "rolloverCents": 0,
          "winners": []
        }
      },
      "simulation": {
        "executedAt": "2026-04-16T07:00:00.000Z",
        "logic": "algorithmic",
        "numbers": [29, 30, 31, 33, 34],
        "notes": "Weighted toward the most and least frequent active-subscriber scores.",
        "tiers": {
          "match5": {
            "winnerIds": [],
            "projectedPoolCents": 2728,
            "projectedAmountEachCents": 0,
            "willRollOver": true
          },
          "match4": {
            "winnerIds": ["user_sub_1", "user_sub_2", "user_sub_4"],
            "projectedPoolCents": 1016,
            "projectedAmountEachCents": 338,
            "willRollOver": false
          },
          "match3": {
            "winnerIds": [],
            "projectedPoolCents": 726,
            "projectedAmountEachCents": 0,
            "willRollOver": false
          }
        }
      }
    }
  ],
  "notifications": [
    {
      "id": "note_system_1",
      "userId": null,
      "audience": "system",
      "type": "system",
      "subject": "April draw window is open",
      "preview": "Admin simulation is ready for review before publishing.",
      "body": "The April 2026 draw has a saved simulation and a live jackpot rollover from March.",
      "status": "sent",
      "createdAt": "2026-04-16T07:05:00.000Z"
    },
    {
      "id": "note_user_riley_1",
      "userId": "user_sub_2",
      "audience": "user",
      "type": "winner",
      "subject": "Winner alert: March 2026",
      "preview": "You have a pending 4-number match win to verify.",
      "body": "Upload your score proof from the golf platform to move your March 2026 payout into review.",
      "status": "sent",
      "createdAt": "2026-04-01T08:10:00.000Z"
    },
    {
      "id": "note_user_sophie_1",
      "userId": "user_sub_1",
      "audience": "user",
      "type": "draw",
      "subject": "March 2026 draw results",
      "preview": "Your March results are in and your payout has been completed.",
      "body": "You landed a 4-number match in the March draw and your verified payout has already been marked as paid.",
      "status": "sent",
      "createdAt": "2026-04-02T10:40:00.000Z"
    },
    {
      "id": "note_user_nina_1",
      "userId": "user_sub_4",
      "audience": "user",
      "type": "winner",
      "subject": "Winner alert: March 2026",
      "preview": "You have a pending 3-number match win waiting for proof.",
      "body": "Upload your golf-platform screenshot to begin verification for your March payout.",
      "status": "sent",
      "createdAt": "2026-04-01T08:15:00.000Z"
    },
    {
      "id": "note_user_sophie_2",
      "userId": "user_sub_1",
      "audience": "user",
      "type": "subscription",
      "subject": "Subscription renewed",
      "preview": "Your monthly plan remains active through 1 May 2026.",
      "body": "Thank you for staying active. Your charity allocation and draw eligibility remain uninterrupted.",
      "status": "sent",
      "createdAt": "2026-04-01T06:30:00.000Z"
    },
    {
      "id": "note_user_welcome_1",
      "userId": "user_sub_1",
      "audience": "user",
      "type": "welcome",
      "subject": "Welcome to Fair Chance Club",
      "preview": "Your account is ready for score entry, draw access, and charity impact.",
      "body": "Start by confirming your charity percentage, then keep your latest five Stableford scores up to date for the next monthly draw.",
      "status": "sent",
      "createdAt": "2026-02-01T11:05:00.000Z"
    }
  ],
  "donations": []
}')
ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload;
