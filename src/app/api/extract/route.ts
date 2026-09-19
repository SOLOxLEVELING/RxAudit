import { NextResponse } from "next/server";
import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
  type DocumentFormat,
  type ImageFormat,
} from "@aws-sdk/client-bedrock-runtime";
import { ExtractedBillSchema } from "@/data/schemas";

export const maxDuration = 60;

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "ap-southeast-2",
});

const modelId = process.env.BEDROCK_MODEL_ID || "anthropic.claude-haiku-4-5-20251001-v1:0";

const DOCUMENT_FORMATS: Record<string, DocumentFormat> = {
  "application/pdf": "pdf",
};

const IMAGE_FORMATS: Record<string, ImageFormat> = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/webp": "webp",
};

const SYSTEM_PROMPT = `You are a pharmacy bill extraction engine for Indian medical stores.

Your task: extract each line item from the table in this pharmacy bill image.

STEP-BY-STEP PROCESS — follow this exactly:
1. First, identify the table columns. Indian pharmacy bills typically have: Sr | HSN | Description | Company | Batch No. | Expiry | Qty | M.R.P. | Amount
2. The LAST numeric column is always "Amount" (total charged for that row). The second-to-last is "M.R.P." (per-strip price). The column before that is "Qty" (number of tablets).
3. For EACH row, use the serial number (Sr) as your anchor. Read Sr, then read across that SAME horizontal line to get Description, Qty, and Amount. Do NOT let your eyes drift to an adjacent row.
4. After reading each row, verify: does Amount ÷ Qty give a reasonable per-tablet price (usually ₹0.50 to ₹50)? If not, you likely read from the wrong row — re-read.

Return ONLY valid JSON matching this schema:
{
  "pharmacyName": "string",
  "billNumber": "string or null",
  "date": "YYYY-MM-DD or null (note: Indian dates are DD-MM-YYYY, convert to YYYY-MM-DD)",
  "lineItems": [
    {
      "drugName": "string (exactly as printed on bill)",
      "quantity": number (from Qty column — total tablets/capsules),
      "unitPrice": number (compute as Amount ÷ Qty — the per-tablet cost),
      "lineTotal": number (from Amount column — total charged for this line)
    }
  ]
}

Rules:
- unitPrice = Amount ÷ Qty. Do NOT use M.R.P. as unitPrice — M.R.P. on Indian bills is per-strip, not per-tablet.
- Drug names: extract EXACTLY as printed. Do not expand abbreviations.
- Date format on Indian bills is DD-MM-YYYY. Convert to YYYY-MM-DD in your output.
- Return ONLY raw JSON. No markdown, no explanation.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileBase64, mimeType, fileName } = body as {
      fileBase64?: string;
      mimeType?: string;
      fileName?: string;
    };

    if (!fileBase64 || !mimeType) {
      return NextResponse.json(
        { error: "fileBase64 and mimeType are required." },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(fileBase64, "base64");

    let contentBlock: ContentBlock;
    const docFormat = DOCUMENT_FORMATS[mimeType];
    const imgFormat = IMAGE_FORMATS[mimeType];

    if (docFormat) {
      contentBlock = {
        document: {
          format: docFormat,
          name: fileName?.replace(/\.[^.]+$/, "") || "bill",
          source: { bytes },
        },
      };
    } else if (imgFormat) {
      contentBlock = {
        image: {
          format: imgFormat,
          source: { bytes },
        },
      };
    } else {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${mimeType}. Use PDF, PNG, JPEG, or WebP.`,
        },
        { status: 400 }
      );
    }

    const command = new ConverseCommand({
      modelId,
      system: [{ text: SYSTEM_PROMPT }],
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            { text: "Extract the pharmacy bill line items and metadata from this document." },
          ],
        },
      ],
      inferenceConfig: {
        maxTokens: 4096,
        temperature: 0.1,
      },
    });

    const response = await client.send(command);

    const outputText =
      response.output?.message?.content?.[0]?.text ?? "";

    const jsonMatch = outputText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Model did not return valid JSON.", raw: outputText },
        { status: 422 }
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse extracted JSON.", raw: outputText },
        { status: 422 }
      );
    }

    const validated = ExtractedBillSchema.safeParse(parsedJson);
    if (!validated.success) {
      return NextResponse.json(
        {
          error: "Extracted data does not match the pharmacy bill schema.",
          details: validated.error.issues,
          raw: outputText,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, bill: validated.data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[extract] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
