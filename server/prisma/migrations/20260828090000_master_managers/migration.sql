CREATE TABLE "MasterManager" (
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterManager_pkey" PRIMARY KEY ("name")
);

INSERT INTO "MasterManager" ("name")
SELECT DISTINCT "managerName"
FROM "Cabinet"
WHERE "managerName" IS NOT NULL AND btrim("managerName") <> ''
ON CONFLICT ("name") DO NOTHING;
