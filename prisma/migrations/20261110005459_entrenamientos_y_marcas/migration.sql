-- CreateTable
CREATE TABLE "public"."Workout" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scoreType" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkoutResult" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "rx" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PersonalRecord" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "movement" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL DEFAULT 1,
    "date" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Workout_date_idx" ON "public"."Workout"("date");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutResult_workoutId_memberId_key" ON "public"."WorkoutResult"("workoutId", "memberId");

-- CreateIndex
CREATE INDEX "PersonalRecord_memberId_movement_idx" ON "public"."PersonalRecord"("memberId", "movement");

-- AddForeignKey
ALTER TABLE "public"."WorkoutResult" ADD CONSTRAINT "WorkoutResult_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "public"."Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkoutResult" ADD CONSTRAINT "WorkoutResult_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PersonalRecord" ADD CONSTRAINT "PersonalRecord_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
