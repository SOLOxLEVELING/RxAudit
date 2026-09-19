import { NextResponse } from "next/server";
import { z } from "zod";
import { BillLineItemSchema } from "@/data/schemas";
import { auditBill } from "@/lib/audit-engine";
import { drugDatabase } from "@/data";

const AuditRequestSchema = z.object({
  lineItems: z.array(BillLineItemSchema),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = AuditRequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "Invalid bill line items submitted for audit.",
          details: validated.error.issues,
        },
        { status: 400 }
      );
    }

    const { lineItems } = validated.data;
    const report = auditBill(lineItems, drugDatabase);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[audit] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
