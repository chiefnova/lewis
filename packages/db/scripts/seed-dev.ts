import { Pool } from "pg";

import { databaseUrlFromConfig, resolveMigrationDatabaseConnectionConfig } from "../src/config.js";
import { assertLocalDatabaseSafe } from "./_local-safety.js";

function assertSeedSafeOrExit(connectionString: string): void {
  assertLocalDatabaseSafe({ connectionString, scriptName: "seed-dev.ts" });

  if (process.env.CORRIDOR_SEED_ALLOW_NON_LOCAL === "true") {
    throw new Error(
      "CORRIDOR_SEED_ALLOW_NON_LOCAL is not a real escape hatch. The seed script intentionally has no override.",
    );
  }
}

const ids = {
  tenants: {
    sponsor: "00000000-0000-4000-8000-000000000001",
    etc: "00000000-0000-4000-8000-000000000002",
    patient: "00000000-0000-4000-8000-000000000003",
    board: "00000000-0000-4000-8000-000000000004",
    internal: "00000000-0000-4000-8000-000000000005",
  },
  users: {
    sponsor: "00000000-0000-4000-8000-000000000101",
    etc: "00000000-0000-4000-8000-000000000102",
    patient: "00000000-0000-4000-8000-000000000103",
    board: "00000000-0000-4000-8000-000000000104",
    internal: "00000000-0000-4000-8000-000000000105",
  },
  relationships: {
    sponsorToEtc: "00000000-0000-4000-8000-000000000201",
    etcToPatient: "00000000-0000-4000-8000-000000000202",
    boardToEtc: "00000000-0000-4000-8000-000000000203",
  },
  business: {
    sponsor: "00000000-0000-4000-8000-000000000301",
    etc: "00000000-0000-4000-8000-000000000302",
    patient: "00000000-0000-4000-8000-000000000303",
    program: "00000000-0000-4000-8000-000000000304",
  },
};

async function main(): Promise<void> {
  const connectionString = databaseUrlFromConfig(resolveMigrationDatabaseConnectionConfig());
  assertSeedSafeOrExit(connectionString);

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query("begin");

    const jurisdiction = await client.query<{ id: string }>(
      "select id from regulatory_jurisdictions where code = $1",
      ["US-MT"],
    );

    const jurisdictionId = jurisdiction.rows[0]?.id;
    if (!jurisdictionId) {
      throw new Error("Missing US-MT jurisdiction. Run migrations before seeding.");
    }

    await client.query(
      `
      insert into tenants (id, kind, status, display_name)
      values
        ($1, 'sponsor', 'active', 'Local Sponsor Biotech'),
        ($2, 'etc', 'active', 'Local Experimental Treatment Center'),
        ($3, 'patient', 'active', 'Local Synthetic Patient'),
        ($4, 'board', 'active', 'Local Review Board'),
        ($5, 'corridor_internal', 'active', 'Corridor Internal')
      on conflict (id) do update set
        status = excluded.status,
        display_name = excluded.display_name,
        updated_at = now()
      `,
      [
        ids.tenants.sponsor,
        ids.tenants.etc,
        ids.tenants.patient,
        ids.tenants.board,
        ids.tenants.internal,
      ],
    );

    await client.query(
      `
      insert into users (id, clerk_user_id, email, name)
      values
        ($1, 'local_sponsor_user', 'sponsor@example.test', 'Local Sponsor User'),
        ($2, 'local_etc_user', 'etc@example.test', 'Local ETC User'),
        ($3, 'local_patient_user', 'patient@example.test', 'Local Synthetic Patient'),
        ($4, 'local_board_user', 'board@example.test', 'Local Board User'),
        ($5, 'local_internal_user', 'internal@example.test', 'Local Corridor Admin')
      on conflict (clerk_user_id) do update set
        email = excluded.email,
        name = excluded.name,
        updated_at = now()
      `,
      [ids.users.sponsor, ids.users.etc, ids.users.patient, ids.users.board, ids.users.internal],
    );

    await client.query(
      `
      insert into tenant_memberships (user_id, tenant_id, role, status)
      values
        ($1, $6, 'sponsor_admin', 'active'),
        ($2, $7, 'etc_admin', 'active'),
        ($3, $8, 'patient', 'active'),
        ($4, $9, 'board_reviewer', 'active'),
        ($5, $10, 'corridor_admin', 'active')
      on conflict (user_id, tenant_id, role) do update set status = excluded.status
      `,
      [
        ids.users.sponsor,
        ids.users.etc,
        ids.users.patient,
        ids.users.board,
        ids.users.internal,
        ids.tenants.sponsor,
        ids.tenants.etc,
        ids.tenants.patient,
        ids.tenants.board,
        ids.tenants.internal,
      ],
    );

    await client.query(
      `
      insert into tenant_relationships (id, from_tenant_id, to_tenant_id, kind, scope_json, status)
      values
        ($1, $4, $5, 'ppa', '{"visibility":"aggregate_only_mvp"}'::jsonb, 'active'),
        ($2, $5, $6, 'care_team', '{"scope":["patient_file:read"]}'::jsonb, 'active'),
        ($3, $7, $5, 'board_review', '{"scope":["protocol:read","safety:read"]}'::jsonb, 'active')
      on conflict (id) do update set
        scope_json = excluded.scope_json,
        status = excluded.status
      `,
      [
        ids.relationships.sponsorToEtc,
        ids.relationships.etcToPatient,
        ids.relationships.boardToEtc,
        ids.tenants.sponsor,
        ids.tenants.etc,
        ids.tenants.patient,
        ids.tenants.board,
      ],
    );

    await client.query(
      `
      insert into sponsor_organizations (id, tenant_id, legal_name)
      values ($1, $2, 'Local Sponsor Biotech')
      on conflict (tenant_id) do update set legal_name = excluded.legal_name
      `,
      [ids.business.sponsor, ids.tenants.sponsor],
    );

    await client.query(
      `
      insert into etcs (id, tenant_id, jurisdiction_id, license_number, status)
      values ($1, $2, $3, 'LOCAL-ETC-001', 'provisional')
      on conflict (tenant_id) do update set
        jurisdiction_id = excluded.jurisdiction_id,
        license_number = excluded.license_number,
        status = excluded.status
      `,
      [ids.business.etc, ids.tenants.etc, jurisdictionId],
    );

    await client.query(
      `
      insert into patients (id, tenant_id, jurisdiction_id, primary_user_id, full_name)
      values ($1, $2, $3, $4, 'Local Synthetic Patient')
      on conflict (tenant_id) do update set
        jurisdiction_id = excluded.jurisdiction_id,
        primary_user_id = excluded.primary_user_id,
        full_name = excluded.full_name
      `,
      [ids.business.patient, ids.tenants.patient, jurisdictionId, ids.users.patient],
    );

    await client.query(
      `
      insert into programs (
        id,
        sponsor_tenant_id,
        jurisdiction_id,
        name,
        drug,
        indication,
        phase,
        treatment_form,
        status
      )
      values ($1, $2, $3, 'Local Synthetic Program', 'Synthetic investigational product', 'Synthetic indication', 'expanded_access', 'outpatient', 'draft')
      on conflict (id) do update set
        name = excluded.name,
        drug = excluded.drug,
        indication = excluded.indication,
        phase = excluded.phase,
        treatment_form = excluded.treatment_form,
        status = excluded.status
      `,
      [ids.business.program, ids.tenants.sponsor, jurisdictionId],
    );

    await client.query("commit");
    console.warn("Seeded local synthetic Corridor tenants, users, relationships, and program.");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown seed error";
  console.error(message);
  process.exit(1);
});
