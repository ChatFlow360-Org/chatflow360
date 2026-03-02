-- AlterTable: make category_id nullable on prompt_pieces for global rules
ALTER TABLE "prompt_pieces" ALTER COLUMN "category_id" DROP NOT NULL;
