/**
 * CI gate: keep apps/api/src/openapi.ts in lockstep with the actual Hono
 * routes mounted in apps/api/src/server.ts and the domain route files at
 * apps/api/src/domains/*\/routes.ts.
 *
 * AST-based replacement for the previous regex implementation. The
 * TypeScript compiler API is already in the workspace devDependencies and
 * is invoked dynamically below.
 *
 * Detection model:
 *   1. Auto-discover apps/api/src/domains/*\/routes.ts so a brand-new domain
 *      dir is caught instead of silently bypassing the gate.
 *   2. Parse apps/api/src/server.ts to extract every <router>.route('/prefix',
 *      <varName>) sub-router mount. Resolve <varName> back to its routes.ts
 *      file via the import declarations.
 *   3. Parse each routes.ts and collect every <varName>.<method>('path', ...)
 *      call. METHODS includes get/post/put/patch/delete/head/options/all,
 *      plus .openapi() — the documented migration target. Reject template
 *      literals with substitutions and Hono-specific path forms (:name?,
 *      :name{regex}, catch-all *) with a clear error.
 *   4. Parse server.ts to pick up app-level routes outside /v1 (/healthz,
 *      /readyz) and the public scaffolding (/v1/openapi.json, /v1/docs).
 *   5. Parse openapi.ts AST to pull the paths object literal from the
 *      built document and compare.
 *
 * Run via: node scripts/check-openapi-route-drift.mjs
 */
import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { createRequire } from "node:module";

// typescript is a CJS package; pull it via createRequire so we get the full
// API shape (named exports vary across versions when imported as ESM).
const require = createRequire(import.meta.url);
/** @type {typeof import("typescript")} */
const ts = require("typescript");

const DOMAINS_DIR = "apps/api/src/domains";
const SERVER_FILE = "apps/api/src/server.ts";
const OPENAPI_FILE = "apps/api/src/openapi.ts";

const METHODS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
  "all",
  "openapi",
]);

// Routes registered directly on app or v1Public/v1Authed/v1 with literal
// paths. /healthz and /readyz live on app and ARE documented in openapi.ts.
const WELL_KNOWN_OPERATIONS = new Set(["GET /healthz", "GET /readyz"]);

// Meta-endpoints that serve the OpenAPI spec itself or its UI. These are
// intentionally not part of the spec — the spec doesn't describe its own
// serving URL — so we exclude them from drift detection on the route side.
const META_ENDPOINTS = new Set(["GET /v1/openapi.json", "GET /v1/docs"]);

// Domains that must always exist; the drift gate fails if any goes missing
// (defense against an accidental rename that silently removes a router).
const REQUIRED_DOMAINS = new Set([
  "boards",
  "etcs",
  "internal-admin",
  "patients",
  "search",
  "sponsors",
  "webhooks",
]);

function parseTypeScript(file) {
  const source = readFileSync(file, "utf8");
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function findRouteVariableImports(serverSource) {
  const importsByVar = new Map();
  ts.forEachChild(serverSource, (node) => {
    if (!ts.isImportDeclaration(node)) return;
    const moduleSpecifier = node.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) return;
    const importPath = moduleSpecifier.text;
    if (!importPath.startsWith("./domains/") && !importPath.startsWith("../")) return;
    const clause = node.importClause;
    if (!clause?.namedBindings || !ts.isNamedImports(clause.namedBindings)) return;
    for (const element of clause.namedBindings.elements) {
      const localName = element.name.text;
      importsByVar.set(localName, importPath);
    }
  });
  return importsByVar;
}

function resolveImportToRoutesFile(importPath) {
  // server.ts uses './domains/<name>/routes' (no .js or .ts suffix in the
  // import). Hono routes always live in routes.ts per the existing layout.
  let normalized = importPath;
  if (normalized.endsWith(".js") || normalized.endsWith(".ts")) {
    normalized = normalized.slice(0, -3);
  }
  const withRoutes = normalized.endsWith("/routes") ? normalized : `${normalized}/routes`;
  return resolvePath("apps/api/src", `${withRoutes}.ts`).replace(`${process.cwd()}/`, "");
}

function findSubRouterMounts(serverSource, importsByVar) {
  // Capture every `.route('/prefix', <varName>)` call where <varName> was
  // imported from a domains/* /routes module.
  const mounts = [];
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "route" &&
      node.arguments.length === 2
    ) {
      const [prefixArg, routerArg] = node.arguments;
      if (
        ts.isStringLiteral(prefixArg) &&
        ts.isIdentifier(routerArg) &&
        importsByVar.has(routerArg.text)
      ) {
        mounts.push({
          prefix: prefixArg.text,
          variable: routerArg.text,
          importPath: importsByVar.get(routerArg.text),
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(serverSource);
  return mounts;
}

function findAppLevelRoutes(serverSource) {
  // Routes registered directly on app, v1Public, v1Authed, or v1 via
  // .get/.post(<literal>, ...) outside of a sub-router mount.
  const ops = new Set();
  const ROOTS = new Set(["app", "v1Public", "v1Authed", "v1"]);
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      ROOTS.has(node.expression.expression.text) &&
      METHODS.has(node.expression.name.text) &&
      node.arguments.length >= 1
    ) {
      const method = node.expression.name.text.toUpperCase();
      const root = node.expression.expression.text;
      const pathArg = node.arguments[0];
      if (ts.isStringLiteral(pathArg)) {
        const prefix = root === "v1Public" || root === "v1Authed" || root === "v1" ? "/v1" : "";
        ops.add(`${method} ${normalizePath(`${prefix}${pathArg.text}`)}`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(serverSource);
  return ops;
}

function honoToOpenApiPath(path) {
  if (path.includes("*")) {
    throw new Error(
      `Catch-all wildcard path '${path}' is not supported by OpenAPI; refusing to translate.`,
    );
  }
  if (/:[A-Za-z][A-Za-z0-9_]*\?/.test(path)) {
    throw new Error(
      `Optional Hono param ':name?' in '${path}' has no clean OpenAPI mapping; refusing to translate. Split into two explicit routes if needed.`,
    );
  }
  if (/:[A-Za-z][A-Za-z0-9_]*\{/.test(path)) {
    throw new Error(
      `Regex-constrained Hono param ':name{...}' in '${path}' has no clean OpenAPI mapping; refusing to translate.`,
    );
  }
  return path.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, "{$1}");
}

function normalizePath(path) {
  if (!path) return "/";
  const collapsed = path.replace(/\/+/g, "/");
  if (collapsed === "") return "/";
  if (collapsed.length > 1 && collapsed.endsWith("/")) return collapsed.slice(0, -1);
  return collapsed;
}

function joinPaths(prefix, segment) {
  return normalizePath(`${prefix}${segment === "/" ? "" : segment}`);
}

function extractRouteOperationsFromFile(file, prefix, variable) {
  const source = parseTypeScript(file);
  const ops = new Set();
  let matchCount = 0;

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === variable &&
      METHODS.has(node.expression.name.text) &&
      node.arguments.length >= 1
    ) {
      const method = node.expression.name.text;
      const pathArg = node.arguments[0];
      let pathLiteral;

      if (ts.isStringLiteral(pathArg)) {
        pathLiteral = pathArg.text;
      } else if (ts.isNoSubstitutionTemplateLiteral(pathArg)) {
        pathLiteral = pathArg.text;
      } else if (ts.isTemplateExpression(pathArg)) {
        throw new Error(
          `${file}: ${variable}.${method}(...) uses a template literal with substitutions ` +
            `for the path. Drift detection requires a literal string.`,
        );
      } else if (method === "openapi" && ts.isObjectLiteralExpression(pathArg)) {
        // .openapi(route, handler) form: pull path/method from the route object.
        let innerPath;
        let innerMethod;
        for (const prop of pathArg.properties) {
          if (!ts.isPropertyAssignment(prop)) continue;
          const name = ts.isIdentifier(prop.name)
            ? prop.name.text
            : ts.isStringLiteral(prop.name)
              ? prop.name.text
              : null;
          if (name === "path" && ts.isStringLiteral(prop.initializer)) {
            innerPath = prop.initializer.text;
          }
          if (name === "method" && ts.isStringLiteral(prop.initializer)) {
            innerMethod = prop.initializer.text;
          }
        }
        if (innerPath !== undefined && innerMethod !== undefined) {
          ops.add(
            `${innerMethod.toUpperCase()} ${joinPaths(prefix, honoToOpenApiPath(innerPath))}`,
          );
          matchCount++;
        }
        return;
      }

      if (pathLiteral !== undefined) {
        ops.add(`${method.toUpperCase()} ${joinPaths(prefix, honoToOpenApiPath(pathLiteral))}`);
        matchCount++;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);

  if (matchCount === 0) {
    throw new Error(
      `${file}: zero routes detected on variable '${variable}'. Either the variable name has changed (update the import in ${SERVER_FILE}) or this routes file is empty.`,
    );
  }

  return ops;
}

function extractOpsFromPathsObject(pathsObject, ops) {
  for (const pathProp of pathsObject.properties) {
    if (!ts.isPropertyAssignment(pathProp)) continue;
    const pathName = ts.isStringLiteral(pathProp.name)
      ? pathProp.name.text
      : ts.isIdentifier(pathProp.name)
        ? pathProp.name.text
        : null;
    if (!pathName) continue;
    if (!ts.isObjectLiteralExpression(pathProp.initializer)) continue;
    for (const methodProp of pathProp.initializer.properties) {
      if (!ts.isPropertyAssignment(methodProp)) continue;
      const method = ts.isIdentifier(methodProp.name)
        ? methodProp.name.text
        : ts.isStringLiteral(methodProp.name)
          ? methodProp.name.text
          : null;
      if (!method || !METHODS.has(method.toLowerCase())) continue;
      ops.add(`${method.toUpperCase()} ${pathName}`);
    }
  }
}

function extractOpenApiOperations() {
  const source = parseTypeScript(OPENAPI_FILE);
  const ops = new Set();

  // Two emission shapes are supported:
  //   1. `paths: { ... }` as a PropertyAssignment inside the document
  //      object literal (e.g. when document is constructed at once).
  //   2. `<x>.paths = { ... }` as a BinaryExpression assignment after the
  //      document is constructed (the current openapi.ts pattern). The
  //      initial `paths: {}` is ignored because its object-literal has
  //      zero properties.
  function visit(node) {
    if (
      ts.isPropertyAssignment(node) &&
      ((ts.isIdentifier(node.name) && node.name.text === "paths") ||
        (ts.isStringLiteral(node.name) && node.name.text === "paths")) &&
      ts.isObjectLiteralExpression(node.initializer) &&
      node.initializer.properties.length > 0
    ) {
      extractOpsFromPathsObject(node.initializer, ops);
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      node.left.name.text === "paths" &&
      ts.isObjectLiteralExpression(node.right)
    ) {
      extractOpsFromPathsObject(node.right, ops);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);

  return ops;
}

async function main() {
  const failures = [];

  // 1. Discover domain dirs.
  const domains = (await readdir(DOMAINS_DIR)).filter((entry) => !entry.startsWith("."));
  for (const required of REQUIRED_DOMAINS) {
    if (!domains.includes(required)) {
      failures.push(`Missing required domain dir: ${DOMAINS_DIR}/${required}`);
    }
  }

  // 2. Parse server.ts: imports + sub-router mounts + app-level routes.
  const serverSource = parseTypeScript(SERVER_FILE);
  const importsByVar = findRouteVariableImports(serverSource);
  const mounts = findSubRouterMounts(serverSource, importsByVar);

  // 3. Build the route operation set from well-known + app-level routes.
  // META_ENDPOINTS are stripped — they serve the OpenAPI doc itself and are
  // intentionally not described by it.
  const routeOperations = new Set();
  for (const op of WELL_KNOWN_OPERATIONS) routeOperations.add(op);
  for (const op of findAppLevelRoutes(serverSource)) {
    if (!META_ENDPOINTS.has(op)) routeOperations.add(op);
  }

  // 4. Confirm every domain dir has a corresponding mount in server.ts.
  const mountedDomains = new Set(
    mounts
      .map((m) => /domains\/([^/]+)\//.exec(m.importPath)?.[1])
      .filter((d) => typeof d === "string"),
  );
  for (const domain of domains) {
    if (!mountedDomains.has(domain)) {
      failures.push(
        `Domain '${domain}' has no .route(...) mount in ${SERVER_FILE} — its routes will not be served.`,
      );
    }
  }

  // 5. For each mount, walk the routes file and collect operations.
  for (const mount of mounts) {
    const file = resolveImportToRoutesFile(mount.importPath);
    const prefix = `/v1${mount.prefix}`.replace(/\/+/g, "/");
    try {
      const ops = extractRouteOperationsFromFile(file, prefix, mount.variable);
      for (const op of ops) routeOperations.add(op);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  // 6. Compare to documented OpenAPI operations.
  const openApiOperations = extractOpenApiOperations();

  const missingFromOpenApi = [...routeOperations].filter((op) => !openApiOperations.has(op)).sort();
  const staleOpenApi = [...openApiOperations].filter((op) => !routeOperations.has(op)).sort();

  if (failures.length > 0 || missingFromOpenApi.length > 0 || staleOpenApi.length > 0) {
    console.error("OpenAPI route drift check FAILED:");
    for (const f of failures) console.error(`  ${f}`);
    for (const op of missingFromOpenApi) console.error(`  Missing from OpenAPI: ${op}`);
    for (const op of staleOpenApi) console.error(`  OpenAPI path has no route: ${op}`);
    process.exit(1);
  }

  console.warn(
    `OpenAPI route drift check PASSED: ${routeOperations.size} live operations across ${mounts.length} sub-routers + ${WELL_KNOWN_OPERATIONS.size} well-known endpoints, all documented in ${OPENAPI_FILE}. ${META_ENDPOINTS.size} meta endpoints intentionally excluded.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exit(1);
});
