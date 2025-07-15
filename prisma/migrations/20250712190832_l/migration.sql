/*
  Warnings:

  - Added the required column `duration` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `duration` to the `Image` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "File" ADD COLUMN     "duration" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "duration" DOUBLE PRECISION NOT NULL;
