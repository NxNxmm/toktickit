import { runSeed, prisma } from '../prisma/seed.js';

/**
 * Canonizes the development database before the server test run starts.
 *
 * The E2E suite deliberately re-provisions the seeded IT Staff accounts
 * (admin reset -> mandatory first-login change), which leaves their live
 * password and `requiresPasswordChange` flag drifted from the seed values. The
 * API suites, by contrast, assume the seeded credentials (`Password123!`) are
 * in force. Running the idempotent seed up front restores the documented
 * development state so `npm test` passes cleanly no matter what suites ran
 * before. It only rewrites the seed fixtures that `prisma/seed.ts` owns, so it
 * never touches suites' own test data (their emails/prefixes differ).
 */
export default async function globalSetup(): Promise<void> {
  await runSeed();
  await prisma.$disconnect();
}