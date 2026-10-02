-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('NEW', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'HIRED');

-- CreateTable
CREATE TABLE "JobPosting" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "employmentType" "EmploymentType" NOT NULL,
    "summary" TEXT NOT NULL,
    "responsibilities" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "portfolioUrl" TEXT,
    "message" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobPosting_slug_key" ON "JobPosting"("slug");

-- CreateIndex
CREATE INDEX "JobPosting_status_publishedAt_idx" ON "JobPosting"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "JobPosting_createdAt_idx" ON "JobPosting"("createdAt");

-- CreateIndex
CREATE INDEX "JobApplication_jobId_createdAt_idx" ON "JobApplication"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "JobApplication_status_createdAt_idx" ON "JobApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "JobApplication_email_idx" ON "JobApplication"("email");

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobPosting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
