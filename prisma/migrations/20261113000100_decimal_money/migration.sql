-- Money is stored as exact decimals, never binary floats.
ALTER TABLE "Expense" ALTER COLUMN "amount" TYPE DECIMAL(12,2) USING "amount"::numeric(12,2);
ALTER TABLE "Income" ALTER COLUMN "amount" TYPE DECIMAL(12,2) USING "amount"::numeric(12,2);
ALTER TABLE "InventoryItem" ALTER COLUMN "unitCost" TYPE DECIMAL(12,2) USING "unitCost"::numeric(12,2);
ALTER TABLE "Livestock" ALTER COLUMN "acquisitionCost" TYPE DECIMAL(12,2) USING "acquisitionCost"::numeric(12,2);
