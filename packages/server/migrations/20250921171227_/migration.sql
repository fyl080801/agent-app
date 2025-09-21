-- AlterTable
ALTER TABLE "ComfyToolParameter" ADD COLUMN     "isRandom" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isToolParameter" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxFloat" DOUBLE PRECISION,
ADD COLUMN     "minFloat" DOUBLE PRECISION,
ADD COLUMN     "randomBit" TEXT DEFAULT '64';

-- CreateTable
CREATE TABLE "ModelProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "endpoint" TEXT NOT NULL DEFAULT '',
    "apiKey" TEXT NOT NULL DEFAULT '',
    "defaultModel" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ModelProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalProfile" (
    "id" INTEGER NOT NULL,
    "modelProvider" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "GlobalProfile_pkey" PRIMARY KEY ("id")
);
