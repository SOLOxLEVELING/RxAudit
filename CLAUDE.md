# RxAudit — Project Reference & Conventions

RxAudit is an automated chronic-medication price auditor for Indian pharmacy bills. It uses AI vision to extract printed line items and prices from pharmacy receipts, then checks every item against government-regulated ceiling prices published by the National Pharmaceutical Pricing Authority (NPPA) under the Drugs (Prices Control) Order (DPCO) 2013. The tool flags illegal overcharges, projects annual compounding costs for chronic care refills, generates instant pharmacist counter discussion cards, and provides pre-filled grievance drafts for NPPA's Pharma Sahi Daam portal.

## Tech Stack
- **Framework**: Next.js 15 (App Router, Server & Client Components)
- **UI & Styling**: Tailwind CSS v4, Lucide React icons
- **Validation**: Zod (strict schema validation for all entities)
- **AI Extraction**: AWS Bedrock Runtime (`amazon.nova-pro-v1:0` / Converse API)
- **Runtime / Language**: Node.js 22+, TypeScript 5

## Core Architectural Principle
**LLM extracts, typed code verifies.**
- The vision model (Nova Pro) does exactly one job: reading the bill image and outputting structured JSON (`POST /api/extract`).
- The LLM **never** determines whether a price is fair, calculates overcharges, or recommends medicines.
- All price comparisons, fuzzy matching to 151 NPPA scheduled drugs, ceiling checks, and overcharge arithmetic happen in deterministic TypeScript code (`src/lib/audit-engine.ts`, `src/lib/drug-matcher.ts`).

## Key Developer Commands
- `npm run dev`: Start Next.js local development server (port 3000)
- `npm run build`: Build production bundle and verify static/dynamic routes
- `npm run validate-db`: Validate all 151 drug database entries against `DrugEntrySchema`
- `npx tsx src/lib/audit-engine.test.ts`: Run the 32-assertion automated test suite covering all sample bills and edge cases
- `npx tsc --noEmit`: Run TypeScript static typechecker

## UI & Design Conventions
- **Dark Mode Fintech Aesthetic**: `bg-zinc-950` root background, `bg-zinc-900` card surfaces, `border-zinc-800` borders.
- **Monospace for Numbers**: All prices, quantities, dates, and bill numbers use `font-mono`.
- **No Decorative Excess**: No gradients, no glowing blurs, no `rounded-3xl`. Compact density (`p-3` or `p-4`).
- **Currency**: Always Indian Rupee (`₹`), formatted with Indian comma grouping (`new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`). Never display USD or `$`.
- **Mandatory Medical Disclaimer**: Every screen or card showing a generic alternative must feature the exact copy:
  > *Ask your doctor or pharmacist about the generic equivalent.*
- **Annual Cost Projection Label**: Always label the 12-month calculation as:
  > *Estimated annual impact (assuming monthly refills)*
