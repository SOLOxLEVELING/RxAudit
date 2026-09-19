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

const modelId = process.env.BEDROCK_MODEL_ID || "amazon.nova-pro-v1:0";

const DOCUMENT_FORMATS: Record<string, DocumentFormat> = {
  "application/pdf": "pdf",
};

const IMAGE_FORMATS: Record<string, ImageFormat> = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/webp": "webp",
};

const SYSTEM_PROMPT = `You are a pharmacy bill extraction engine for Indian medical stores.

Extract line items from this pharmacy bill image. Return ONLY valid JSON matching this schema:
{
  "pharmacyName": "string",
  "billNumber": "string or null if not visible",
  "date": "YYYY-MM-DD or null if not visible",
  "lineItems": [
    {
      "drugName": "string (exactly as printed — brand name, strength, and form)",
      "quantity": number,
      "unitPrice": number (per single unit — tablet, capsule, strip),
      "lineTotal": number
    }
  ]
}

Rules for Indian pharmacy bills:
- "MRP" means Maximum Retail Price — use this as unitPrice if no separate unit price column exists.
- If the bill shows a "strip" or "pack" price and a quantity of strips, calculate: unitPrice = strip price, quantity = number of strips.
- Drug names are often abbreviated: "TELMI 40" = Telmisartan 40mg, "AMLO 5" = Amlodipine 5mg. Extract EXACTLY what is printed — do not expand abbreviations.
- If lineTotal and quantity are present but unitPrice is missing, compute unitPrice = lineTotal / quantity.
- If columns are ambiguous, prefer: Qty | Drug Name | Batch | MRP | Amount.
- Return ONLY the raw JSON. No markdown, no explanation.`;

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
        maxTokens: 2048,
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
