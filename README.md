# RxAudit

**Automated pharmacy bill price auditor for India's chronic-medication patients.**

RxAudit catches illegal overcharges on pharmacy bills by cross-referencing every line item against NPPA's published ceiling prices under the Drugs (Prices Control) Order, 2013. Upload a receipt, get an instant audit — with regulatory citations, annual cost projections, and a pre-filled grievance draft ready for NPPA's Pharma Sahi Daam portal.

## The Problem

Over 50% of India's essential medicine market is price-controlled by the National Pharmaceutical Pricing Authority (NPPA). Pharmacies are legally prohibited from charging above the published ceiling price for 153+ scheduled drugs. Yet overcharging is widespread — and chronic-care patients refilling monthly prescriptions absorb compounding losses they can't easily detect.

There is no consumer-facing tool that reads a pharmacy bill and tells you, line by line, whether you were overcharged and by how much.

## How It Works

```
Pharmacy Bill Image  ──>  AI Vision Extraction  ──>  Deterministic Price Audit
                          (Claude Haiku 4.5)         (TypeScript, no AI)
```

**LLM extracts. Typed code verifies.** The AI model does exactly one job: reading the bill image and outputting structured JSON. It never determines whether a price is fair. All price comparisons, fuzzy matching to 153 NPPA scheduled drugs, ceiling checks, and overcharge arithmetic happen in deterministic TypeScript — no hallucination risk on the numbers that matter.

### What You Get

- **Line-by-line audit** — each medication checked against its DPCO 2013 ceiling price
- **Overcharge detection** — exact amount above the legal limit, per item and total
- **Annual cost projection** — compounded overcharge assuming monthly chronic-care refills
- **Pharmacist counter card** — a discussion reference to bring to the pharmacy counter
- **NPPA grievance draft** — pre-formatted complaint text for the Pharma Sahi Daam portal, one click to copy
- **Generic alternatives** — Jan Aushadhi equivalents with pricing where available

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | Tailwind CSS v4, Lucide React |
| Validation | Zod (strict schema validation) |
| AI Extraction | Claude Haiku 4.5 via AWS Bedrock (Converse API) |
| Audit Engine | Deterministic TypeScript — fuzzy matching + arithmetic |
| Drug Database | 153 NPPA-scheduled drugs with ceiling prices, salts, and generics |

## Getting Started

### Prerequisites

- Node.js 22+
- AWS account with Bedrock access (for bill image extraction)

### Setup

```bash
git clone https://github.com/SOLOxLEVELING/RxAudit.git
cd RxAudit
npm install
```

Create a `.env.local` file:

```env
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-west-2
BEDROCK_MODEL_ID=anthropic.claude-haiku-4-5-20251001-v1:0
```

> **Note:** AWS credentials are only needed for uploading real bill images. The sample bills and deterministic audit engine work without any external API.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Other Commands

```bash
npm run build           # Production build
npm run validate-db     # Validate all 153 drug database entries
npx tsx src/lib/audit-engine.test.ts  # Run test suite (32 assertions)
npx tsc --noEmit        # TypeScript type check
```

## Architecture

```
src/
  app/
    page.tsx                 # Main UI — bill input, audit results, modals
    api/
      extract/route.ts       # AI vision extraction (Bedrock / Claude Haiku 4.5)
      audit/route.ts         # Deterministic price audit endpoint
  components/
    BillUpload.tsx           # File upload + sample bill selector
    ExtractedBillEditor.tsx  # Editable line items table
    AuditResults.tsx         # Verdict card + medications table
    PharmacistCard.tsx       # Counter discussion card modal
    GrievanceDraft.tsx       # NPPA grievance text generator
  lib/
    audit-engine.ts          # Core audit logic — matching + arithmetic
    drug-matcher.ts          # Fuzzy matching to NPPA scheduled drugs
    formatters.ts            # INR formatting utilities
  data/
    drug-database.ts         # 153 NPPA-scheduled drugs with ceiling prices
    sample-bills.ts          # Demo bills for instant testing
    schemas.ts               # Zod schemas for all entities
```

## Regulatory Context

The **Drugs (Prices Control) Order, 2013** empowers NPPA to fix ceiling prices for essential medicines listed in the National List of Essential Medicines (NLEM). Pharmacists selling these drugs above the notified ceiling price are in violation of the DPCO and liable for penalties under the Essential Commodities Act, 1955.

Consumers can file complaints through NPPA's **Pharma Sahi Daam** portal. RxAudit generates the complaint text automatically.

## License

MIT
