import drugDatabaseRaw from "./drug-database.json";
import { DrugEntrySchema, type DrugEntry } from "./schemas";
import { z } from "zod";

const DrugDatabaseSchema = z.array(DrugEntrySchema);

// Validate and export the drug database
const parseResult = DrugDatabaseSchema.safeParse(drugDatabaseRaw);

if (!parseResult.success) {
  console.error(
    "Drug database validation failed:",
    parseResult.error.format()
  );
  throw new Error("Drug database validation failed");
}

export const drugDatabase: DrugEntry[] = parseResult.data;

export { type DrugEntry } from "./schemas";
