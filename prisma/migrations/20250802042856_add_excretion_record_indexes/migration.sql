-- CreateIndex
CREATE INDEX "excretion_records_catId_idx" ON "excretion_records"("catId");

-- CreateIndex
CREATE INDEX "excretion_records_recordedAt_idx" ON "excretion_records"("recordedAt");

-- CreateIndex
CREATE INDEX "excretion_records_type_idx" ON "excretion_records"("type");

-- CreateIndex
CREATE INDEX "excretion_records_catId_recordedAt_idx" ON "excretion_records"("catId", "recordedAt");

-- CreateIndex
CREATE INDEX "excretion_records_catId_type_idx" ON "excretion_records"("catId", "type");

-- CreateIndex
CREATE INDEX "excretion_records_recordedAt_type_idx" ON "excretion_records"("recordedAt", "type");

-- CreateIndex
CREATE INDEX "excretion_records_catId_recordedAt_type_idx" ON "excretion_records"("catId", "recordedAt", "type");
