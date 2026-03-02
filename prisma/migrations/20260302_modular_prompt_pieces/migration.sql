-- CreateTable: business_categories
CREATE TABLE "business_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique name and slug
CREATE UNIQUE INDEX "business_categories_name_key" ON "business_categories"("name");
CREATE UNIQUE INDEX "business_categories_slug_key" ON "business_categories"("slug");

-- CreateTable: prompt_pieces
CREATE TABLE "prompt_pieces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_pieces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: category + type for filtered queries
CREATE INDEX "prompt_pieces_category_id_type_idx" ON "prompt_pieces"("category_id", "type");

-- AddForeignKey: prompt_pieces -> business_categories
ALTER TABLE "prompt_pieces" ADD CONSTRAINT "prompt_pieces_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "business_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: organizations — add business_category_id
ALTER TABLE "organizations" ADD COLUMN "business_category_id" UUID;

-- AddForeignKey: organizations -> business_categories
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_business_category_id_fkey" FOREIGN KEY ("business_category_id") REFERENCES "business_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropTable: prompt_templates (replaced by modular prompt_pieces)
DROP TABLE "prompt_templates";
