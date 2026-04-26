import { readFileSync } from "node:fs";

// Validates the fnox.toml service-role boundary:
//   1. SUPABASE_SERVICE_ROLE_KEY appears ONLY inside the workers_elevated_dev profile.
//   2. SUPABASE_SERVICE_ROLE_KEY IS present in workers_elevated_dev (the secret
//      must remain managed; silent removal is itself a regression).
//
// We parse fnox.toml line-by-line because fnox accepts both legacy
// `[profiles.X]` + flat `secrets = [...]` form and current
// `[profiles.X.secrets]` + per-key inline tables. Both shapes are recognized.
//
// The matcher is a TOML-key boundary regex (^\s*KEY\s*=) so substring
// false-positives like `MY_SUPABASE_SERVICE_ROLE_KEY_NOTES = ...` do not trip
// the gate. currentProfile is reset on ANY section header so a key that
// appears under `[providers.age]` (or any future top-level table) is
// correctly attributed to "outside a profile" rather than misattributed to
// the most recent `[profiles.X]` block.

const FNOX_FILE = "fnox.toml";
const SERVICE_ROLE_KEY = "SUPABASE_SERVICE_ROLE_KEY";

const ALLOWED_SERVICE_ROLE_PROFILES = new Set(["workers_elevated_dev"]);
const REGULAR_RUNTIME_PROFILES = new Set([
  "api_dev",
  "workers_dev",
  "frontend_app_dev",
  "frontend_patient_dev",
  "ci",
]);

// Any TOML section header — used to reset profile state.
const SECTION_HEADER = /^\s*\[([^\]]+)\]\s*$/;
// Profile-bearing section headers, capturing the profile name.
const PROFILE_HEADER = /^\s*\[profiles\.([A-Za-z0-9_-]+)(?:\.secrets)?\]\s*$/;
// Legacy form: `secrets = [ "KEY1", "KEY2", ... ]` directly under [profiles.X].
const LEGACY_SECRETS_LIST_OPEN = /^\s*secrets\s*=\s*\[/;
// Service-role key as a TOML key (matches `KEY = ...` or just the bare KEY in
// a quoted-string inside a legacy secrets list).
const SERVICE_ROLE_AS_KEY = new RegExp(`^\\s*${SERVICE_ROLE_KEY}\\s*=`);
const SERVICE_ROLE_IN_LIST_LINE = new RegExp(`(^|[\\s\\[,])"${SERVICE_ROLE_KEY}"(?=[\\s\\],])`);

function stripComment(line) {
  // TOML strings can contain '#' but our values for secrets are simple inline
  // tables or quoted lists; defensively strip after the first '#' that is not
  // inside a double-quoted string.
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inString = !inString;
    } else if (ch === "#" && !inString) {
      return line.slice(0, i);
    }
  }
  return line;
}

const toml = readFileSync(FNOX_FILE, "utf8");
const lines = toml.split(/\r?\n/);

const failures = [];
const profilesContainingKey = new Set();

let currentProfile = null;
let inLegacySecretsList = false;
let legacySecretsListProfile = null;

for (const [index, rawLine] of lines.entries()) {
  const lineNumber = index + 1;
  const line = stripComment(rawLine);

  const sectionMatch = line.match(SECTION_HEADER);
  if (sectionMatch) {
    // Any section ends a legacy secrets list.
    inLegacySecretsList = false;
    legacySecretsListProfile = null;

    const profileMatch = line.match(PROFILE_HEADER);
    currentProfile = profileMatch ? (profileMatch[1] ?? null) : null;
    continue;
  }

  // Legacy `secrets = [ ... ]` block opening.
  if (currentProfile && LEGACY_SECRETS_LIST_OPEN.test(line)) {
    inLegacySecretsList = true;
    legacySecretsListProfile = currentProfile;
    // Fall through: an opening line can also contain entries.
  }

  // Detect the service-role key — three shapes:
  //   1. `SUPABASE_SERVICE_ROLE_KEY = { provider = "age" }` (current form)
  //   2. `"SUPABASE_SERVICE_ROLE_KEY",` inside a legacy `secrets = [...]` block
  //   3. The closing `]` of a legacy list
  let foundOnLine = false;
  if (SERVICE_ROLE_AS_KEY.test(line)) {
    foundOnLine = true;
  } else if (inLegacySecretsList && SERVICE_ROLE_IN_LIST_LINE.test(line)) {
    foundOnLine = true;
  }

  if (line.includes("]")) {
    inLegacySecretsList = false;
    legacySecretsListProfile = null;
  }

  if (!foundOnLine) {
    continue;
  }

  // Attribute to the right profile. The legacy list opens inside currentProfile;
  // the inline-table form lives inside [profiles.X] or [profiles.X.secrets].
  const owningProfile = inLegacySecretsList ? legacySecretsListProfile : currentProfile;

  if (!owningProfile) {
    failures.push(
      `${FNOX_FILE}:${lineNumber}: ${SERVICE_ROLE_KEY} appears outside a [profiles.*] section.`,
    );
    continue;
  }

  profilesContainingKey.add(owningProfile);

  if (!ALLOWED_SERVICE_ROLE_PROFILES.has(owningProfile)) {
    const profileKind = REGULAR_RUNTIME_PROFILES.has(owningProfile)
      ? "regular runtime"
      : "non-elevated";
    failures.push(
      `${FNOX_FILE}:${lineNumber}: ${SERVICE_ROLE_KEY} is present in ${profileKind} profile '${owningProfile}'. ` +
        `It is allowed only in ${[...ALLOWED_SERVICE_ROLE_PROFILES].join(", ")}.`,
    );
  }
}

// Positive assertion: the key MUST be present in every allowed profile so the
// secret stays managed. Silent removal from workers_elevated_dev (e.g. in a
// future fnox edit) would otherwise pass with no boundary alarm.
for (const required of ALLOWED_SERVICE_ROLE_PROFILES) {
  if (!profilesContainingKey.has(required)) {
    failures.push(
      `${FNOX_FILE}: ${SERVICE_ROLE_KEY} must be declared in profile '${required}' (the elevated worker contract). ` +
        "If you intentionally removed it, also remove the profile and update CLAUDE.md.",
    );
  }
}

if (failures.length > 0) {
  console.error("fnox secret boundary check FAILED:");
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  process.exit(1);
}

console.warn(
  `fnox secret boundary check PASSED: ${SERVICE_ROLE_KEY} is absent from regular runtime profiles ` +
    `and present in ${[...profilesContainingKey].join(", ")}.`,
);
