-- CreateTable
CREATE TABLE "public"."StockMovement" (
    "id" SERIAL NOT NULL,
    "variantId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "userId" INTEGER,
    "customerId" INTEGER,
    "orderId" INTEGER,
    "adjustmentId" INTEGER,
    "operation" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousQuantity" INTEGER NOT NULL,
    "newQuantity" INTEGER NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StockAdjustment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockMovement_variantId_idx" ON "public"."StockMovement"("variantId");

-- CreateIndex
CREATE INDEX "StockMovement_storeId_idx" ON "public"."StockMovement"("storeId");

-- CreateIndex
CREATE INDEX "StockMovement_userId_idx" ON "public"."StockMovement"("userId");

-- CreateIndex
CREATE INDEX "StockMovement_customerId_idx" ON "public"."StockMovement"("customerId");

-- CreateIndex
CREATE INDEX "StockMovement_orderId_idx" ON "public"."StockMovement"("orderId");

-- CreateIndex
CREATE INDEX "StockMovement_adjustmentId_idx" ON "public"."StockMovement"("adjustmentId");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "public"."StockMovement"("createdAt");

-- CreateIndex
CREATE INDEX "StockAdjustment_userId_idx" ON "public"."StockAdjustment"("userId");

-- CreateIndex
CREATE INDEX "StockAdjustment_storeId_idx" ON "public"."StockAdjustment"("storeId");

-- CreateIndex
CREATE INDEX "StockAdjustment_createdAt_idx" ON "public"."StockAdjustment"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "public"."StockAdjustment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockAdjustment" ADD CONSTRAINT "StockAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockAdjustment" ADD CONSTRAINT "StockAdjustment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
