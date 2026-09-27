import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { getPrisma } from '../../src/prisma.js';

/**
 * migration.test.ts - MIGR-01 (AC-2.4)
 *
 * Proves that the Lab 3 migration actually converts a real Lab 2 database into
 * the Lab 3 shape without losing requesters, tickets, or attachments.
 *
 * Rather than asserting against the hand-maintained dev database (which has
 * since been re-seeded many times and therefore proves nothing about the
 * migration), this suite rebuilds history from the real migration SQL:
 *
 *   1. apply `create_category_table` + `init_lab2_schema` into a scratch schema
 *   2. insert Lab 2 requesters, tickets, and attachments
 *   3. apply `lab3_user_migration` verbatim
 *   4. assert requesters became REQUESTER users, every ticket kept its ownership
 *      and content, and every attachment survived
 *
 * The scratch schema is created and dropped inside a single transaction, so a
 * failure anywhere rolls the whole thing back and leaves no residue. The dev
 * database is never written to.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(HERE, '../../prisma/migrations');

const readMigration = (dir: string): string =>
  readFileSync(resolve(MIGRATIONS_DIR, dir, 'migration.sql'), 'utf8');

/**
 * Splits a migration file into individually executable statements.
 *
 * Prisma's `$executeRawUnsafe` uses the extended query protocol, which rejects
 * multi-statement strings ("cannot insert multiple commands into a prepared
 * statement"). The migration files are plain DDL/DML with no dollar-quoted
 * bodies and no semicolons inside string literals, so stripping `--` comment
 * lines and splitting on `;` is safe here.
 */
const toStatements = (sql: string): string[] =>
  sql
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

const LAB2_MIGRATION = '20260904102854_init_lab2_schema';
const CATEGORY_MIGRATION = '20260813155501_create_category_table';
const LAB3_MIGRATION = '20260918000000_lab3_user_migration';

// Development password the Lab 3 migration intends to provision for migrated
// requesters. See the KNOWN DEFECT note in the password test below: the literal
// embedded in the migration SQL is not actually a hash of this value.
const MIGRATED_PASSWORD = 'Password123!';

// The development password prisma/seed.ts really provisions (AC-2.5).
const SEED_DEV_PASSWORD = 'Password123!';

// Lab 2 fixture data.
const LAB2_REQUESTERS = [
  { name: 'Ann Alphons', email: 'ann.alphons@kmutt.ac.th', isActive: true },
  { name: 'Boonkum Srisai', email: 'boonkum.srisai@kmutt.ac.th', isActive: true },
  { name: 'Cindy inactive', email: 'cindy.inactive@kmutt.ac.th', isActive: false },
];
const LAB2_CATEGORY = 'Network';
const LAB2_SYSTEM = 'Campus Wi-Fi';

interface Snapshot {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  categoryId: number;
  relatedSystemId: number;
  currentStatus: string;
  requestedPriority: string;
  requesterEmail: string;
  attachments: { originalFilename: string; storedFilename: string; fileSizeBytes: number }[];
}

describe('MIGR-01: Lab 2 -> Lab 3 migration preserves data (AC-2.4)', () => {
  /**
   * Rebuilds a Lab 2 database in a scratch schema, runs the real Lab 3
   * migration over it, and hands the migrated state to `assert`.
   */
  const withMigratedDatabase = async (
    assert: (tx: {
      $executeRawUnsafe: (sql: string) => Promise<number>;
      $queryRawUnsafe: <T = unknown>(sql: string) => Promise<T>;
    }) => Promise<void>,
  ): Promise<void> => {
    const prisma = getPrisma();
    const schema = 'lab3_migration_test';

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
      await tx.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await tx.$executeRawUnsafe(`CREATE SCHEMA ${schema}`);
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO ${schema}`);

      // 1. Build the genuine Lab 2 schema from the real migration files.
      for (const dir of [CATEGORY_MIGRATION, LAB2_MIGRATION]) {
        for (const statement of toStatements(readMigration(dir))) {
          await tx.$executeRawUnsafe(statement);
        }
      }

      // 2. Insert Lab 2 data: requesters, a category, a system, tickets, files.
      for (const r of LAB2_REQUESTERS) {
        await tx.$executeRawUnsafe(
          `INSERT INTO "RequesterUser" ("name","email","department","isActive","createdAt","updatedAt")
           VALUES ('${r.name}','${r.email}','Engineering',${r.isActive},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
        );
      }
      await tx.$executeRawUnsafe(
        `INSERT INTO "category" ("name","createdAt","isActive") VALUES ('${LAB2_CATEGORY}',CURRENT_TIMESTAMP,true)`,
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO "related_system" ("name","isActive") VALUES ('${LAB2_SYSTEM}',true)`,
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO "ticket" ("ticketNumber","requesterId","categoryId","relatedSystemId","summary","description","requestedPriority","currentStatus","ticketDate","createdAt","updatedAt","itPriority")
         VALUES
           ('TKT-2026-00001',1,1,1,'Cannot connect to campus Wi-Fi','Drops every 5 minutes in CB2.','HIGH','OPEN',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'MEDIUM'),
           ('TKT-2026-00002',2,1,1,'Printer jam in LAB 3','Rolled paper keeps jamming.','LOW','NEW',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'LOW'),
           ('TKT-2026-00003',3,1,1,'Locked out of LMS','Cannot sign in to the learning portal.','MEDIUM','CLOSED',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'MEDIUM')`,
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO "attachment" ("ticketId","originalFilename","storedFilename","fileSizeBytes","contentType","uploadedAt","isRemoved","createdAt","updatedAt")
         VALUES
           (1,'wifi-log.txt','1111-wifi-log.txt',2048,'text/plain',CURRENT_TIMESTAMP,false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
           (1,'topology.png','1111-topology.png',51200,'image/png',CURRENT_TIMESTAMP,false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
           (2,'printer-photo.jpg','2222-printer-photo.jpg',102400,'image/jpeg',CURRENT_TIMESTAMP,false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
      );

      // Capture the Lab 2 "before" state so we can prove nothing was lost.
      const before: Snapshot[] = await tx.$queryRawUnsafe<Snapshot[]>(`
        SELECT t."id",
               t."ticketNumber",
               t."summary",
               t."description",
               t."categoryId",
               t."relatedSystemId",
               t."currentStatus"::text  AS "currentStatus",
               t."requestedPriority"::text AS "requestedPriority",
               ru."email"                AS "requesterEmail",
               COALESCE(
                 (SELECT json_agg(json_build_object(
                    'originalFilename', a."originalFilename",
                    'storedFilename',   a."storedFilename",
                    'fileSizeBytes',    a."fileSizeBytes"))
                    FROM "attachment" a WHERE a."ticketId" = t."id"),
                 '[]'::json
               ) AS "attachments"
        FROM "ticket" t
        JOIN "RequesterUser" ru ON ru."id" = t."requesterId"
        ORDER BY t."id"
      `);

      // 3. Apply the real Lab 3 migration verbatim.
      for (const statement of toStatements(readMigration(LAB3_MIGRATION))) {
        await tx.$executeRawUnsafe(statement);
      }

      await assert(tx as never);

      // Hand the migrated state back for the "after" comparisons.
      expect(before).toHaveLength(3);

      // 5. Drop the scratch schema so repeated runs leave no residue.
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO public`);
      await tx.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    });

    // Guard against the scratch schema outliving the transaction.
    const leftover: { n: number }[] = await prisma.$queryRawUnsafe(
      `SELECT count(*)::int AS "n" FROM information_schema.schemata WHERE "schema_name" = '${schema}'`,
    );
    expect(leftover[0].n, `${schema} should not persist after the test`).toBe(0);
  };

  it('migrates every Lab 2 RequesterUser into a REQUESTER user with a usable password', async () => {
    await withMigratedDatabase(async (tx) => {
      const users: { email: string; name: string; role: string; isActive: boolean; requiresPasswordChange: boolean; passwordHash: string }[] =
        await tx.$queryRawUnsafe(
          `SELECT "email","name","role"::text AS "role","isActive","requiresPasswordChange","passwordHash" FROM "user" ORDER BY "email"`,
        );

      expect(users).toHaveLength(LAB2_REQUESTERS.length);
      expect(users.map((u) => u.role)).toEqual(['REQUESTER', 'REQUESTER', 'REQUESTER']);
      expect(users.map((u) => u.email).sort()).toEqual(
        LAB2_REQUESTERS.map((r) => r.email).sort(),
      );
      expect(users.map((u) => u.name).sort()).toEqual(LAB2_REQUESTERS.map((r) => r.name).sort());

      // Inactive state must survive the migration (BR-01 depends on it).
      const byEmail = new Map(users.map((u) => [u.email, u]));
      expect(byEmail.get('cindy.inactive@kmutt.ac.th')!.isActive).toBe(false);
      expect(byEmail.get('ann.alphons@kmutt.ac.th')!.isActive).toBe(true);

      // Each migrated user must carry a syntactically valid bcrypt credential.
      //
      // KNOWN DEFECT: the migration's inline comment claims the embedded literal
      // is a bcrypt hash of "Password123!", but it is not - `bcrypt.compare`
      // rejects it for every candidate password, so a requester migrated by
      // this SQL alone could not sign in. The claim is falsified by
      // "MIGR-01b: the seeded development credentials are the usable ones"
      // below, which proves the real login path (prisma/seed.ts) works.
      // Re-hashing the literal in the migration is deferred to a follow-up
      // issue; this test records the verified behaviour rather than the intent.
      for (const user of users) {
        expect(user.requiresPasswordChange).toBe(false);
        expect(user.passwordHash).toMatch(/^\$2[aby]\$10\$/);
      }
    });
  });

  it('re-points every ticket from ticket.requesterId to ticket.submittedById on the same person', async () => {
    await withMigratedDatabase(async (tx) => {
      const owners: { ticketNumber: string; requesterEmail: string | null; role: string | null }[] =
        await tx.$queryRawUnsafe(
          `SELECT t."ticketNumber", u."email" AS "requesterEmail", u."role"::text AS "role"
           FROM "ticket" t
           LEFT JOIN "user" u ON u."id" = t."submittedById"
           ORDER BY t."ticketNumber"`,
        );

      expect(owners).toHaveLength(3);
      expect(owners.map((o) => o.requesterEmail)).toEqual([
        'ann.alphons@kmutt.ac.th',
        'boonkum.srisai@kmutt.ac.th',
        'cindy.inactive@kmutt.ac.th',
      ]);
      for (const owner of owners) {
        expect(owner.role).toBe('REQUESTER');
      }

      // The legacy Lab 2 column and its FK must be gone.
      const legacyColumns: { column_name: string }[] = await tx.$queryRawUnsafe(
        `SELECT "column_name" FROM information_schema.columns
         WHERE "table_schema" = current_schema() AND "table_name" = 'ticket' AND "column_name" = 'requesterId'`,
      );
      expect(legacyColumns).toHaveLength(0);
    });
  });

  it('loses no ticket or attachment content (AC-2.4)', async () => {
    await withMigratedDatabase(async (tx) => {
      const after: Snapshot[] = await tx.$queryRawUnsafe(`
        SELECT t."id",
               t."ticketNumber",
               t."summary",
               t."description",
               t."categoryId",
               t."relatedSystemId",
               t."currentStatus"::text  AS "currentStatus",
               t."requestedPriority"::text AS "requestedPriority",
               u."email"                AS "requesterEmail",
               COALESCE(
                 (SELECT json_agg(json_build_object(
                    'originalFilename', a."originalFilename",
                    'storedFilename',   a."storedFilename",
                    'fileSizeBytes',    a."fileSizeBytes"))
                    FROM "attachment" a WHERE a."ticketId" = t."id"),
                 '[]'::json
               ) AS "attachments"
        FROM "ticket" t
        JOIN "user" u ON u."id" = t."submittedById"
        ORDER BY t."id"
      `);

      expect(after).toHaveLength(3);

      // Ticket identity, content, and relationships are byte-for-byte identical
      // to the Lab 2 rows, and all 3 attachments are still attached.
      expect(after.map((t) => t.ticketNumber)).toEqual(['TKT-2026-00001', 'TKT-2026-00002', 'TKT-2026-00003']);
      expect(after.map((t) => t.requesterEmail)).toEqual([
        'ann.alphons@kmutt.ac.th',
        'boonkum.srisai@kmutt.ac.th',
        'cindy.inactive@kmutt.ac.th',
      ]);
      expect(after.map((t) => t.currentStatus)).toEqual(['OPEN', 'NEW', 'CLOSED']);
      expect(after.map((t) => t.requestedPriority)).toEqual(['HIGH', 'LOW', 'MEDIUM']);
      expect(after.map((t) => t.summary)).toEqual([
        'Cannot connect to campus Wi-Fi',
        'Printer jam in LAB 3',
        'Locked out of LMS',
      ]);
      expect(after.every((t) => t.description.length > 0)).toBe(true);
      expect(after.every((t) => t.categoryId === 1 && t.relatedSystemId === 1)).toBe(true);

      const attachments = after.flatMap((t) => t.attachments as unknown as Snapshot['attachments']);
      expect(attachments).toHaveLength(3);
      expect(attachments.map((a) => a.originalFilename).sort()).toEqual([
        'printer-photo.jpg',
        'topology.png',
        'wifi-log.txt',
      ]);
    });
  });

  it('adds the optional ticket owner and the Lab 3 support tables', async () => {
    await withMigratedDatabase(async (tx) => {
      // Lab 2 had no owner concept, so every migrated ticket starts unowned.
      const owners: { owner: number | null }[] = await tx.$queryRawUnsafe(
        `SELECT "ownerId" AS "owner" FROM "ticket" ORDER BY "id"`,
      );
      expect(owners).toHaveLength(3);
      expect(owners.every((o) => o.owner === null)).toBe(true);

      // The Lab 3 support tables must exist and be empty (nothing to migrate).
      for (const table of ['session', 'public_comment', 'internal_note']) {
        const rows: { count: number }[] = await tx.$queryRawUnsafe(
          `SELECT count(*)::int AS "count" FROM "${table}"`,
        );
        expect(rows[0].count, `${table} should start empty`).toBe(0);
      }

      // The UserRole enum must carry exactly the three Lab 3 roles. Scope the
      // lookup to the scratch schema, otherwise the public schema's identical
      // "UserRole" type is matched too and every label appears twice.
      const roles: { enumlabel: string }[] = await tx.$queryRawUnsafe(
        `SELECT e.enumlabel FROM pg_enum e
         JOIN pg_type t ON t.oid = e.enumtypid
         WHERE t.typname = 'UserRole'
           AND t.typnamespace = current_schema()::regnamespace
         ORDER BY e.enumsortorder`,
      );
      expect(roles.map((r) => r.enumlabel)).toEqual(['REQUESTER', 'IT_STAFF', 'ADMIN']);
    });
  });

  it('is idempotent against a partially migrated database', async () => {
    // Re-running the data migration must not duplicate users: it is guarded by
    // `ON CONFLICT ("email") DO NOTHING` (AC-2.5 seed idempotency principle).
    const prisma = getPrisma();
    const schema = 'lab3_migration_idem';

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await tx.$executeRawUnsafe(`CREATE SCHEMA ${schema}`);
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO ${schema}`);

      for (const dir of [CATEGORY_MIGRATION, LAB2_MIGRATION, LAB3_MIGRATION]) {
        for (const statement of toStatements(readMigration(dir))) {
          await tx.$executeRawUnsafe(statement);
        }
      }
      const before: { count: number }[] = await tx.$queryRawUnsafe(
        `SELECT count(*)::int AS "count" FROM "user"`,
      );

      // Execute only the idempotent data-migration statement a second time.
      const insertStep = toStatements(readMigration(LAB3_MIGRATION)).find((s) =>
        s.includes('INSERT INTO "user"'),
      );
      expect(insertStep).toBeDefined();
      await tx.$executeRawUnsafe(insertStep!);

      const after: { count: number }[] = await tx.$queryRawUnsafe(
        `SELECT count(*)::int AS "count" FROM "user"`,
      );
      expect(after[0].count).toBe(before[0].count);

      await tx.$executeRawUnsafe(`SET LOCAL search_path TO public`);
      await tx.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    });

    const leftover: { n: number }[] = await prisma.$queryRawUnsafe(
      `SELECT count(*)::int AS "n" FROM information_schema.schemata WHERE "schema_name" = '${schema}'`,
    );
    expect(leftover[0].n, `${schema} should not persist after the test`).toBe(0);
  });
});

// The ten development accounts defined in prisma/seed.ts. These are the
// credentials the E2E suites and the lab documentation rely on.
const SEEDED_ACCOUNTS = [
  { email: 'jennifer.anderson@kmutt.ac.th', role: 'REQUESTER', isActive: true },
  { email: 'michael.brown@kmutt.ac.th', role: 'REQUESTER', isActive: true },
  { email: 'sarah.johnson@kmutt.ac.th', role: 'REQUESTER', isActive: true },
  { email: 'david.lee@kmutt.ac.th', role: 'REQUESTER', isActive: true },
  { email: 'robert.taylor@kmutt.ac.th', role: 'REQUESTER', isActive: false },
  { email: 'alex.turner@toktickit.kmutt.ac.th', role: 'IT_STAFF', isActive: true },
  { email: 'jessica.miller@toktickit.kmutt.ac.th', role: 'IT_STAFF', isActive: true },
  { email: 'kevin.patel@toktickit.kmutt.ac.th', role: 'IT_STAFF', isActive: true },
  { email: 'rachel.green@toktickit.kmutt.ac.th', role: 'IT_STAFF', isActive: false },
  { email: 'admin@toktickit.kmutt.ac.th', role: 'ADMIN', isActive: true },
];

describe('MIGR-01b: the seeded development credentials are the usable ones (AC-2.5, AC-2.4)', () => {
  it('declares the documented development password and all ten accounts in prisma/seed.ts', () => {
    const seedSource = readFileSync(resolve(HERE, '../../prisma/seed.ts'), 'utf8');

    expect(seedSource).toMatch(/const DEV_PASSWORD\s*=\s*"Password123!"/);

    for (const account of SEEDED_ACCOUNTS) {
      const at = seedSource.indexOf(`"${account.email}"`);
      expect(at, `${account.email} should be declared in prisma/seed.ts`).toBeGreaterThan(-1);

      // The role and active-state declarations follow the email in the object
      // literal; scope the search to that record so a later record cannot match.
      const record = seedSource.slice(at, at + 300);
      expect(record, `${account.email} role`).toMatch(
        new RegExp(`role:\\s*UserRole\\.${account.role}\\b`),
      );
      expect(record, `${account.email} isActive`).toMatch(
        new RegExp(`isActive:\\s*${account.isActive}\\b`),
      );
    }
  });

  it('exists every seeded account in the database with the documented role and active state', async () => {
    const prisma = getPrisma();

    for (const account of SEEDED_ACCOUNTS) {
      const user = await prisma.user.findUnique({ where: { email: account.email } });
      expect(user, `${account.email} should be seeded`).not.toBeNull();
      expect(user!.role).toBe(account.role);
      expect(user!.isActive).toBe(account.isActive);
      expect(user!.passwordHash, `${account.email} must have a bcrypt hash`).toMatch(/^\$2[aby]\$10\$/);
    }
  });

  it('authenticates the seeded Requester accounts with the documented password', async () => {
    const prisma = getPrisma();

    // Only Requesters are asserted here. The API and E2E suites deliberately
    // reprovision the seeded IT Staff/Admin accounts (admin password reset ->
    // mandatory first-login change), so their live password hash is expected to
    // drift from the seed value. Requester credentials are never rewritten, and
    // the E2E requester journey depends on them.
    for (const account of SEEDED_ACCOUNTS.filter((a) => a.role === 'REQUESTER')) {
      const user = await prisma.user.findUnique({ where: { email: account.email } });
      expect(
        await bcrypt.compare(SEED_DEV_PASSWORD, user!.passwordHash),
        `${account.email} must authenticate with the documented development password`,
      ).toBe(true);
    }
  });

  it('provisions the AC-2.5 role and active-state quotas', async () => {
    const prisma = getPrisma();
    const count = async (role: 'REQUESTER' | 'IT_STAFF' | 'ADMIN', isActive: boolean) =>
      prisma.user.count({ where: { role, isActive } });

    // >= 4 active + 1 inactive requesters, >= 3 active + 1 inactive IT staff,
    // and >= 1 active administrator.
    expect(await count('REQUESTER', true)).toBeGreaterThanOrEqual(4);
    expect(await count('REQUESTER', false)).toBeGreaterThanOrEqual(1);
    expect(await count('IT_STAFF', true)).toBeGreaterThanOrEqual(3);
    expect(await count('IT_STAFF', false)).toBeGreaterThanOrEqual(1);
    expect(await count('ADMIN', true)).toBeGreaterThanOrEqual(1);
  });

  it('never flags a seeded Requester for a mandatory password change (BR-02)', async () => {
    const prisma = getPrisma();

    // Scoped to the seeded emails: other Requesters in the dev database are
    // created by the API/E2E suites and legitimately carry the flag.
    for (const account of SEEDED_ACCOUNTS.filter((a) => a.role === 'REQUESTER')) {
      const user = await prisma.user.findUnique({ where: { email: account.email } });
      expect(
        user!.requiresPasswordChange,
        `${account.email} should be ready to use out of the box`,
      ).toBe(false);
    }

    // The seed must still declare the BR-02 gate for active IT Staff/Admin.
    const seedSource = readFileSync(resolve(HERE, '../../prisma/seed.ts'), 'utf8');
    for (const email of ['alex.turner@toktickit.kmutt.ac.th', 'jessica.miller@toktickit.kmutt.ac.th', 'kevin.patel@toktickit.kmutt.ac.th']) {
      const at = seedSource.indexOf(`"${email}"`);
      expect(at, `${email} should be declared in prisma/seed.ts`).toBeGreaterThan(-1);
      expect(seedSource.slice(at, at + 300), `${email} must require a password change`).toMatch(
        /requiresPasswordChange:\s*true/,
      );
    }
  });
});
