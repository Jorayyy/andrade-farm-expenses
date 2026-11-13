-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "paddyId" TEXT,
ADD COLUMN     "seasonId" TEXT;

-- AlterTable
ALTER TABLE "Income" ADD COLUMN     "paddyId" TEXT,
ADD COLUMN     "seasonId" TEXT;

-- CreateTable
CREATE TABLE "Paddy" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "areaHa" DECIMAL(10,4) NOT NULL,
    "lengthM" DOUBLE PRECISION,
    "widthM" DOUBLE PRECISION,
    "soilType" TEXT,
    "irrigationType" TEXT NOT NULL DEFAULT 'Irrigated',
    "waterSource" TEXT,
    "elevationM" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paddy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiceVariety" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ecosystem" TEXT NOT NULL DEFAULT 'Irrigated',
    "maturityDays" INTEGER NOT NULL,
    "potentialYieldTha" DECIMAL(6,2) NOT NULL,
    "seedRateKgHa" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "nRequirementKgHa" DOUBLE PRECISION NOT NULL DEFAULT 120,
    "blastResistance" TEXT,
    "bphResistance" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiceVariety_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "paddyId" TEXT NOT NULL,
    "varietyId" TEXT,
    "label" TEXT NOT NULL,
    "seasonType" TEXT NOT NULL DEFAULT 'Wet',
    "method" TEXT NOT NULL DEFAULT 'Transplanted',
    "status" TEXT NOT NULL DEFAULT 'Planned',
    "nurseryDate" TIMESTAMP(3),
    "plantingDate" TIMESTAMP(3),
    "expectedHarvestDate" TIMESTAMP(3),
    "harvestDate" TIMESTAMP(3),
    "seedRateKgHa" DOUBLE PRECISION,
    "targetYieldTha" DECIMAL(6,2),
    "actualYieldKg" DECIMAL(12,2),
    "grainMoisturePct" DOUBLE PRECISION,
    "pricePerKg" DECIMAL(8,2),
    "nAppliedKg" DOUBLE PRECISION,
    "pAppliedKg" DOUBLE PRECISION,
    "kAppliedKg" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterLog" (
    "id" TEXT NOT NULL,
    "paddyId" TEXT NOT NULL,
    "seasonId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "waterDepthCm" DOUBLE PRECISION,
    "irrigationMm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rainfallMm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "drainageMm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaterLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldOperation" (
    "id" TEXT NOT NULL,
    "paddyId" TEXT NOT NULL,
    "seasonId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "cost" DECIMAL(12,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldIssue" (
    "id" TEXT NOT NULL,
    "paddyId" TEXT NOT NULL,
    "seasonId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 1,
    "affectedPct" DOUBLE PRECISION,
    "treatment" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "paddyId" TEXT,
    "seasonId" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Other',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Normal',
    "status" TEXT NOT NULL DEFAULT 'Open',
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Paddy_code_key" ON "Paddy"("code");

-- CreateIndex
CREATE INDEX "Paddy_status_idx" ON "Paddy"("status");

-- CreateIndex
CREATE INDEX "Paddy_irrigationType_idx" ON "Paddy"("irrigationType");

-- CreateIndex
CREATE UNIQUE INDEX "RiceVariety_name_key" ON "RiceVariety"("name");

-- CreateIndex
CREATE INDEX "Season_paddyId_idx" ON "Season"("paddyId");

-- CreateIndex
CREATE INDEX "Season_status_idx" ON "Season"("status");

-- CreateIndex
CREATE INDEX "Season_plantingDate_idx" ON "Season"("plantingDate");

-- CreateIndex
CREATE INDEX "WaterLog_paddyId_date_idx" ON "WaterLog"("paddyId", "date");

-- CreateIndex
CREATE INDEX "WaterLog_seasonId_idx" ON "WaterLog"("seasonId");

-- CreateIndex
CREATE INDEX "FieldOperation_paddyId_date_idx" ON "FieldOperation"("paddyId", "date");

-- CreateIndex
CREATE INDEX "FieldOperation_seasonId_idx" ON "FieldOperation"("seasonId");

-- CreateIndex
CREATE INDEX "FieldOperation_type_idx" ON "FieldOperation"("type");

-- CreateIndex
CREATE INDEX "FieldIssue_paddyId_date_idx" ON "FieldIssue"("paddyId", "date");

-- CreateIndex
CREATE INDEX "FieldIssue_seasonId_idx" ON "FieldIssue"("seasonId");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_paddyId_idx" ON "Task"("paddyId");

-- CreateIndex
CREATE INDEX "Expense_paddyId_idx" ON "Expense"("paddyId");

-- CreateIndex
CREATE INDEX "Expense_seasonId_idx" ON "Expense"("seasonId");

-- CreateIndex
CREATE INDEX "Income_paddyId_idx" ON "Income"("paddyId");

-- CreateIndex
CREATE INDEX "Income_seasonId_idx" ON "Income"("seasonId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paddyId_fkey" FOREIGN KEY ("paddyId") REFERENCES "Paddy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_paddyId_fkey" FOREIGN KEY ("paddyId") REFERENCES "Paddy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_paddyId_fkey" FOREIGN KEY ("paddyId") REFERENCES "Paddy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "RiceVariety"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterLog" ADD CONSTRAINT "WaterLog_paddyId_fkey" FOREIGN KEY ("paddyId") REFERENCES "Paddy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterLog" ADD CONSTRAINT "WaterLog_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldOperation" ADD CONSTRAINT "FieldOperation_paddyId_fkey" FOREIGN KEY ("paddyId") REFERENCES "Paddy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldOperation" ADD CONSTRAINT "FieldOperation_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldIssue" ADD CONSTRAINT "FieldIssue_paddyId_fkey" FOREIGN KEY ("paddyId") REFERENCES "Paddy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldIssue" ADD CONSTRAINT "FieldIssue_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_paddyId_fkey" FOREIGN KEY ("paddyId") REFERENCES "Paddy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Reference rice varieties (PhilRice/IRRI values, approximate). Farmers should
-- adjust to their own seed tag and field history.
INSERT INTO "RiceVariety" ("id","name","ecosystem","maturityDays","potentialYieldTha","seedRateKgHa","nRequirementKgHa","blastResistance","bphResistance","notes","createdAt") VALUES
('var_rc222','NSIC Rc 222 (Tubigan 18)','Irrigated',114,6.10,40,120,'Moderately resistant','Moderately resistant','Philippines'' most widely planted inbred. Stable across seasons.','2026-11-13T00:00:00Z'),
('var_rc160','NSIC Rc 160','Irrigated',111,7.50,40,120,'Resistant','Moderately resistant','Early maturing, good for double cropping.','2026-11-13T00:00:00Z'),
('var_rc216','NSIC Rc 216','Irrigated',117,7.50,40,120,'Moderately resistant','Resistant','Good eating quality; strong BPH resistance.','2026-11-13T00:00:00Z'),
('var_rc300','NSIC Rc 300','Irrigated',110,8.00,40,120,'Moderately resistant','Moderately resistant','High-yielding inbred for irrigated lowland.','2026-11-13T00:00:00Z'),
('var_rc402','NSIC Rc 402','Irrigated',115,8.00,40,120,'Moderately resistant','Moderately resistant','Improved inbred with good grain quality.','2026-11-13T00:00:00Z'),
('var_rc204h','NSIC Rc 204H (M20)','Irrigated',105,9.00,20,150,'Moderately resistant','Moderately resistant','Hybrid; higher seed cost, needs good management.','2026-11-13T00:00:00Z'),
('var_rc314h','NSIC Rc 314H','Irrigated',108,9.50,20,150,'Moderately resistant','Moderately resistant','High-yielding hybrid for irrigated lowland.','2026-11-13T00:00:00Z'),
('var_rc122','NSIC Rc 122','Irrigated',110,7.00,40,100,'Moderately resistant','Moderately resistant','Early inbred; widely used in dry season.','2026-11-13T00:00:00Z'),
('var_psb82','PSB Rc 82','Irrigated',117,6.50,40,100,'Moderately resistant','Susceptible','Older but dependable inbred.','2026-11-13T00:00:00Z'),
('var_ir64','IR64','Irrigated',116,6.00,40,120,'Susceptible','Resistant','Popular irrigated variety; watch for blast.','2026-11-13T00:00:00Z'),
('var_dinorado','Dinorado','Rainfed',130,4.00,40,90,'Susceptible','Susceptible','Traditional aromatic; lower yield, higher market price.','2026-11-13T00:00:00Z')
ON CONFLICT ("name") DO NOTHING;
