/*
  Warnings:

  - The `workflowDefinition` column on the `ComfyTool` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ComfyTool" ADD COLUMN     "endNode" TEXT NOT NULL DEFAULT '',
DROP COLUMN "workflowDefinition",
ADD COLUMN     "workflowDefinition" JSONB;
