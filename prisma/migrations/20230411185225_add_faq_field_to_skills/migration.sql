-- CreateTable
CREATE TABLE "Faq" (
    "id" UUID NOT NULL,
    "skillName" STRING NOT NULL,
    "q" STRING NOT NULL,
    "a" STRING NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Faq_id_key" ON "Faq"("id");

-- AddForeignKey
ALTER TABLE "Faq" ADD CONSTRAINT "Faq_skillName_fkey" FOREIGN KEY ("skillName") REFERENCES "Skill"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
