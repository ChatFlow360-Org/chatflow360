-- Phase 0: Split fullName into firstName + lastName
-- Only 3 users exist, all data will be migrated

-- Step 1: Add new columns
ALTER TABLE "users" ADD COLUMN "first_name" TEXT;
ALTER TABLE "users" ADD COLUMN "last_name" TEXT;

-- Step 2: Migrate existing data
UPDATE "users" SET
  "first_name" = CASE
    WHEN "full_name" IS NOT NULL AND position(' ' in "full_name") > 0
    THEN left("full_name", position(' ' in "full_name") - 1)
    ELSE "full_name"
  END,
  "last_name" = CASE
    WHEN "full_name" IS NOT NULL AND position(' ' in "full_name") > 0
    THEN substring("full_name" from position(' ' in "full_name") + 1)
    ELSE NULL
  END;

-- Step 3: Drop old column
ALTER TABLE "users" DROP COLUMN "full_name";
