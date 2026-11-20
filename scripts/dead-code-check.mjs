import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const DEFAULT_BASELINE = "docs/developing/dead-code-baseline.json";
const DEFAULT_SCOPE_SOURCE = "docs/developing/arch-baseline.json";
const IGNORED_DIRS = new Set(["node_modules", "dist", ".next", ".vinext", ".git", ".sites-runtime", ".wrangler", ".freebuff", "outputs", "examples"]);
const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".mjs", ".cjs"];

/**
 * Convierte un patrón de ruta con `*` y `**` en expresión regular.
 * @param pattern - Patrón relativo al workspace.
 * @returns Expresión regular anclada.
 */
function globToRegExp(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*\/|\*\*|\*/g, (token) => (
      token === "**/" ? "(?:.*/)?" : token === "**" ? ".*" : "[^/]*"
    ));
  return new RegExp(`^${escaped}$`);
}

/**
 * Comprueba si una ruta relativa coincide con un patrón.
 * @param relativePath - Ruta con barras normales.
 * @param pattern - Patrón del baseline.
 * @returns `true` si coincide.
 */
function matches(relativePath, pattern) {
  return globToRegExp(pattern).test(relativePath);
}

/**
 * Enumera archivos de código y CSS dentro del workspace.
 * @param root - Raíz absoluta.
 * @returns Rutas absolutas.
 */
function listFiles(root) {
  const files = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|mjs|cjs|css)$/.test(entry.name)) files.push(full);
    }
  };
  walk(root);
  return files;
}

/**
 * Resuelve un import relativo o con alias `@/`.
 * @param from - Archivo origen absoluto.
 * @param spec - Especificador importado.
 * @param root - Raíz absoluta.
 * @returns La ruta resuelta o `null`.
 */
function resolveImport(from, spec, root) {
  let base;
  if (spec.startsWith("@/")) base = path.join(root, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  const candidates = [
    base,
    ...CODE_EXTENSIONS.map((extension) => `${base}${extension}`),
    ".css",
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    path.join(base, "index.js"),
    path.join(base, "index.mjs"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/**
 * Extrae los nombres exportados en tiempo de ejecución de un archivo.
 * @param file - Archivo absoluto.
 * @param text - Contenido.
 * @returns Nombres exportados; `default` para la exportación por defecto.
 */
function runtimeExports(file, text) {
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const names = new Set();
  const hasModifier = (node, kind) => ts.canHaveModifiers(node)
    && Boolean(ts.getModifiers(node)?.some((modifier) => modifier.kind === kind));
  const visit = (node) => {
    if (ts.isVariableStatement(node) && hasModifier(node, ts.SyntaxKind.ExportKeyword)) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text);
      }
    }
    if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isEnumDeclaration(node)) {
      if (hasModifier(node, ts.SyntaxKind.ExportKeyword)) {
        names.add(hasModifier(node, ts.SyntaxKind.DefaultKeyword) ? "default" : node.name?.text ?? "default");
      }
    }
    if (ts.isExportDeclaration(node) && !node.isTypeOnly && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const element of node.exportClause.elements) {
        if (!element.isTypeOnly) names.add(element.name.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return names;
}

/**
 * Indica si una ruta es una entrada del framework o de Next.
 * @param relativePath - Ruta con barras normales.
 * @returns `true` si no debe considerarse un módulo huérfano.
 */
function isEntrypoint(relativePath) {
  if (/^app\/(?:.*\/)?(page|layout|route|not-found|error|global-error|loading|template|default|middleware|instrumentation)\.(ts|tsx|js|jsx)$/.test(relativePath)) return true;
  return /^app\/(manifest|robots|sitemap|icon|apple-icon|opengraph-image|twitter-image|favicon)\.(ts|tsx|js|jsx)$/.test(relativePath);
}

/**
 * Indica si el consumidor es una prueba o un helper de pruebas.
 * @param relativePath - Ruta con barras normales.
 * @returns `true` si el consumidor es de pruebas.
 */
function isTestConsumer(relativePath) {
  return /\.(test|spec)\.(ts|tsx|js|mjs|cjs)$/.test(relativePath) || relativePath.startsWith("test-utils/");
}

/**
 * Obtiene el nombre del paquete de un especificador bare.
 * @param spec - Especificador importado.
 * @returns El paquete raíz.
 */
function packageName(spec) {
  return spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
}

/**
 * Indica si un especificador es del runtime, virtual o local.
 * @param spec - Especificador importado.
 * @returns `true` si no es una dependencia npm declarable.
 */
function isRuntimeSpecifier(spec) {
  return spec.startsWith(".")
    || spec.startsWith("@/")
    || spec.startsWith("node:")
    || spec.startsWith("cloudflare:")
    || spec.startsWith("virtual:");
}

/**
 * Ejecuta la comprobación de código muerto.
 * @param options - Raíz, baseline y workspace.
 * @returns Informe estructurado.
 */
export function checkDeadCode({ root, baselinePath = DEFAULT_BASELINE, workspace = process.cwd() }) {
  const resolvedRoot = path.resolve(workspace, root ?? ".");
  const relativeRoot = path.relative(path.resolve(workspace), resolvedRoot);
  if (relativeRoot.startsWith("..") || path.isAbsolute(relativeRoot)) {
    throw new Error("La raíz de código muerto está fuera del workspace. La comprobación falla cerrada.");
  }
  if (!existsSync(path.join(resolvedRoot, "package.json"))) {
    throw new Error(`La raíz ${resolvedRoot} no parece un workspace de Aula Kanban.`);
  }
  const resolvedBaseline = path.resolve(resolvedRoot, baselinePath);
  const relativeBaseline = path.relative(resolvedRoot, resolvedBaseline);
  if (relativeBaseline.startsWith("..") || path.isAbsolute(relativeBaseline)) {
    throw new Error("El baseline de código muerto está fuera del workspace. La comprobación falla cerrada.");
  }
  const baseline = JSON.parse(readFileSync(resolvedBaseline, "utf8"));
  const scopeSource = path.resolve(resolvedRoot, baseline.scopeSource ?? DEFAULT_SCOPE_SOURCE);
  const relativeScopeSource = path.relative(resolvedRoot, scopeSource);
  if (relativeScopeSource.startsWith("..") || path.isAbsolute(relativeScopeSource)) {
    throw new Error("El baseline de alcance está fuera del workspace. La comprobación falla cerrada.");
  }
  const scope = JSON.parse(readFileSync(scopeSource, "utf8")).scope;
  if (!Array.isArray(scope)) throw new Error("El baseline de alcance no contiene una lista de patrones.");

  const allFiles = listFiles(resolvedRoot);
  const relative = (file) => path.relative(resolvedRoot, file).replaceAll("\\", "/");
  const isScoped = (file) => scope.some((pattern) => matches(relative(file), pattern));
  const isTest = (file) => /\.(test|spec)\.(ts|tsx|js|mjs|cjs)$/.test(file);
  const productFiles = allFiles.filter((file) => /\.(ts|tsx)$/.test(file) && !file.endsWith(".d.ts") && !isTest(file) && isScoped(file));
  const cssFiles = allFiles.filter((file) => file.endsWith(".css") && isScoped(file));

  const consumers = new Map();
  const importedNames = new Map();
  const bareImports = new Map();
  const cssReferences = new Set();
  const addConsumer = (target, from) => {
    if (!consumers.has(target)) consumers.set(target, new Set());
    consumers.get(target).add(relative(from));
  };
  const addImportedName = (target, name) => {
    if (!importedNames.has(target)) importedNames.set(target, new Set());
    importedNames.get(target).add(name);
  };

  for (const file of allFiles) {
    const from = relative(file);
    const text = readFileSync(file, "utf8");
    if (file.endsWith(".css")) {
      for (const match of text.matchAll(/@import\s+(?:url\()?["']([^"']+)["']/g)) {
        const target = resolveImport(file, match[1], resolvedRoot);
        if (target) cssReferences.add(relative(target));
      }
      continue;
    }
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const visit = (node) => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const spec = node.moduleSpecifier.text;
        const target = resolveImport(file, spec, resolvedRoot);
        if (target) {
          addConsumer(target, file);
          const clause = node.importClause;
          if (clause?.name) addImportedName(target, "default");
          if (clause?.namedBindings) {
            if (ts.isNamespaceImport(clause.namedBindings)) addImportedName(target, "*");
            else for (const element of clause.namedBindings.elements) addImportedName(target, (element.propertyName ?? element.name).text);
          }
        } else if (!isRuntimeSpecifier(spec)) {
          const name = packageName(spec);
          if (!bareImports.has(name)) bareImports.set(name, new Set());
          bareImports.get(name).add(from);
        }
      }
      if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const target = resolveImport(file, node.moduleSpecifier.text, resolvedRoot);
        if (target) {
          addConsumer(target, file);
          if (node.exportClause && ts.isNamedExports(node.exportClause)) {
            for (const element of node.exportClause.elements) {
              addImportedName(target, (element.propertyName ?? element.name).text);
            }
          } else addImportedName(target, "*");
        }
      }
      if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && ts.isStringLiteral(node.moduleReference.expression)) {
        const target = resolveImport(file, node.moduleReference.expression.text, resolvedRoot);
        if (target) {
          addConsumer(target, file);
          addImportedName(target, "*");
        }
      }
      if (ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) {
        const spec = node.arguments[0].text;
        const target = resolveImport(file, spec, resolvedRoot);
        const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
        const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
        if ((isDynamicImport || isRequire) && target) {
          addConsumer(target, file);
          addImportedName(target, "*");
        } else if (!isRuntimeSpecifier(spec) && (isDynamicImport || isRequire)) {
          const name = packageName(spec);
          if (!bareImports.has(name)) bareImports.set(name, new Set());
          bareImports.get(name).add(from);
        }
      }
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text.endsWith(".css")) {
        const target = resolveImport(file, node.moduleSpecifier.text, resolvedRoot);
        if (target) cssReferences.add(relative(target));
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  const publicModules = new Set((baseline.publicModules ?? []).map((entry) => entry.path));
  const testOnlyModules = new Set((baseline.testOnlyModules ?? []).map((entry) => entry.path));
  const deadModules = [];
  const testOnly = [];
  for (const file of productFiles) {
    const from = relative(file);
    if (isEntrypoint(from) || publicModules.has(from)) continue;
    const usedBy = consumers.get(file) ?? new Set();
    if (usedBy.size === 0) deadModules.push({ kind: "dead-module", path: from });
    else if ([...usedBy].every(isTestConsumer)) {
      if (!testOnlyModules.has(from)) testOnly.push({ kind: "test-only-module", path: from, consumers: [...usedBy] });
    }
  }

  const unusedExportBaseline = new Set((baseline.unusedExports ?? []).map((entry) => (
    typeof entry === "string" ? entry : `${entry.path}:${entry.name}`
  )));
  const skipExportCheck = new Set([
    ...publicModules,
    ...testOnlyModules,
    ...deadModules.map((entry) => entry.path),
    ...testOnly.map((entry) => entry.path),
  ]);
  const unusedExports = [];
  for (const file of productFiles) {
    if (isEntrypoint(relative(file)) || skipExportCheck.has(relative(file))) continue;
    const names = runtimeExports(file, readFileSync(file, "utf8"));
    if (names.size === 0) continue;
    const used = importedNames.get(file) ?? new Set();
    if (used.has("*")) continue;
    for (const name of names) {
      if (used.has(name)) continue;
      const key = `${relative(file)}:${name}`;
      if (!unusedExportBaseline.has(key)) unusedExports.push({ kind: "unused-export", path: relative(file), name });
    }
  }

  const packageJson = JSON.parse(readFileSync(path.join(resolvedRoot, "package.json"), "utf8"));
  const declared = new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {}),
  ]);
  const dependencyExceptions = new Set((baseline.dependencyExceptions ?? []).map((entry) => entry.name));
  const unusedDependencies = [];
  for (const name of Object.keys(packageJson.dependencies ?? {})) {
    if (!bareImports.has(name) && !dependencyExceptions.has(name)) unusedDependencies.push({ kind: "unused-dependency", name });
  }
  const undeclaredExceptions = new Set((baseline.undeclaredImportExceptions ?? []).map((entry) => entry.name));
  const undeclaredImports = [];
  for (const [name, files] of bareImports) {
    if (!declared.has(name) && !undeclaredExceptions.has(name)) {
      undeclaredImports.push({ kind: "undeclared-import", name, files: [...files].sort() });
    }
  }

  const cssExceptions = new Set((baseline.cssExceptions ?? []).map((entry) => entry.path));
  const deadCss = cssFiles
    .map(relative)
    .filter((file) => !cssReferences.has(file) && !cssExceptions.has(file))
    .map((file) => ({ kind: "dead-css", path: file }));

  const problems = [...deadModules, ...testOnly, ...unusedExports, ...unusedDependencies, ...undeclaredImports, ...deadCss];
  return {
    ok: problems.length === 0,
    root: resolvedRoot,
    totals: {
      productFiles: productFiles.length,
      cssFiles: cssFiles.length,
      modules: deadModules.length,
      testOnlyModules: testOnly.length,
      unusedExports: unusedExports.length,
      unusedDependencies: unusedDependencies.length,
      undeclaredImports: undeclaredImports.length,
      deadCss: deadCss.length,
    },
    problems,
  };
}

/**
 * Ejecuta el checker desde la línea de comandos.
 * @returns Código de salida.
 */
function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const rootArgIndex = args.indexOf("--root");
  const root = rootArgIndex >= 0 ? args[rootArgIndex + 1] : ".";
  try {
    const result = checkDeadCode({ root });
    if (json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      process.stdout.write(
        `Muertos: ${result.totals.productFiles} archivos de producto, `
        + `${result.totals.modules} módulos huérfanos, ${result.totals.testOnlyModules} solo-test, `
        + `${result.totals.unusedExports} exports sin consumidores, `
        + `${result.totals.unusedDependencies} dependencias sin uso, `
        + `${result.totals.undeclaredImports} imports no declarados, ${result.totals.deadCss} CSS sin uso.\n`,
      );
      for (const problem of result.problems) {
        const location = problem.path ?? problem.name;
        process.stderr.write(`ERROR ${problem.kind}: ${location}${problem.name ? `:${problem.name}` : ""}\n`);
      }
      if (!result.ok) process.stderr.write("Código muerto incorrecto.\n");
      else process.stdout.write("Código muerto correcto.\n");
    }
    return result.ok ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (json) process.stdout.write(`${JSON.stringify({ ok: false, error: message }, null, 2)}\n`);
    else process.stderr.write(`ERROR: ${message}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
