const { z } = require("zod");

const createLedgerEntrySchema = z.object({
  entryId: z.string().min(6).max(100).regex(/^[A-Za-z0-9_-]+$/),
  amount: z.number().positive(),
  meta: z.record(z.unknown()).optional().default({}),
});

module.exports = {
  createLedgerEntrySchema,
};