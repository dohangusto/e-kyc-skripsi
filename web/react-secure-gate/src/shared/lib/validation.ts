import { z } from "zod";

export const caseIdSchema = z.string().min(1, "Case id is required");
