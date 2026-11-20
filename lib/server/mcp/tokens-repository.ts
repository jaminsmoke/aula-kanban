/**
 * Acceso D1 a los tokens personales del MCP.
 *
 * El formato, el hash, la comparación y los metadatos públicos viven en
 * `tokens.ts`; este módulo solo lee, inserta, toca y revoca filas de
 * `mcp_tokens`. Mantiene la interfaz inyectable `TokenDatabase` para que las
 * pruebas usen SQLite en memoria sin Cloudflare.
 */

/** Interfaz mínima de D1 que usa este módulo (`prepare().bind().first/run/all`). */
export type TokenDatabase = {
  prepare(sql: string): {
    bind(...params: Array<string | number | null>): {
      first<T = unknown>(): Promise<T | null>;
      all<T = unknown>(): Promise<{ results: T[] }>;
      run(): Promise<{ meta?: { changes?: number } }>;
    };
  };
};

/** Fila completa de `mcp_tokens`, incluidos hash y sal. */
export type TokenRow = {
  id: string;
  user_id: string;
  email: string;
  label: string;
  token_hash: string;
  salt: string;
  last_used_at: number | null;
  created_at: number;
  revoked_at: number | null;
};

/** Metadatos de listado, sin hash ni sal. */
export type TokenMetaRow = {
  id: string;
  label: string;
  last_used_at: number | null;
  created_at: number;
  revoked_at: number | null;
};

/** Datos de alta de un token ya cifrado. */
export type NewTokenRow = {
  id: string;
  userId: string;
  email: string;
  label: string;
  tokenHash: string;
  salt: string;
  createdAt: number;
};

/**
 * Inserta la fila de un token nuevo.
 * @param db - Base D1 (o adaptador de test).
 * @param input - Identificador, cuenta, etiqueta y material cifrado.
 */
export async function insertTokenRow(db: TokenDatabase, input: NewTokenRow): Promise<void> {
  await db
    .prepare("INSERT INTO mcp_tokens (id, user_id, email, label, token_hash, salt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(input.id, input.userId, input.email, input.label, input.tokenHash, input.salt, input.createdAt)
    .run();
}

/**
 * Busca un token por identificador.
 * @param db - Base D1 (o adaptador de test).
 * @param id - Identificador del token.
 * @returns La fila completa o `null`.
 */
export async function findTokenRow(db: TokenDatabase, id: string): Promise<TokenRow | null> {
  return await db
    .prepare("SELECT id, user_id, email, label, token_hash, salt, last_used_at, created_at, revoked_at FROM mcp_tokens WHERE id = ?")
    .bind(id)
    .first<TokenRow>() ?? null;
}

/**
 * Registra el último uso de un token.
 * @param db - Base D1 (o adaptador de test).
 * @param id - Identificador del token.
 * @param lastUsedAt - Marca de tiempo del uso.
 */
export async function touchTokenRow(db: TokenDatabase, id: string, lastUsedAt: number): Promise<void> {
  await db.prepare("UPDATE mcp_tokens SET last_used_at = ? WHERE id = ?").bind(lastUsedAt, id).run();
}

/**
 * Lista los tokens de una cuenta, sin hash ni sal, de más reciente a más antiguo.
 * @param db - Base D1 (o adaptador de test).
 * @param userId - Cuenta dueña de los tokens.
 * @returns Las filas públicas de `mcp_tokens`.
 */
export async function listTokenRows(db: TokenDatabase, userId: string): Promise<TokenMetaRow[]> {
  const { results } = await db
    .prepare("SELECT id, label, last_used_at, created_at, revoked_at FROM mcp_tokens WHERE user_id = ? ORDER BY created_at DESC, id DESC")
    .bind(userId)
    .all<TokenMetaRow>();
  return results;
}

/**
 * Revoca un token propio marcando `revoked_at`.
 * @param db - Base D1 (o adaptador de test).
 * @param userId - Cuenta dueña del token.
 * @param id - Identificador del token.
 * @param revokedAt - Marca de tiempo de la revocación.
 * @returns `true` si se revocó; `false` si no existe o no es de la cuenta.
 */
export async function revokeTokenRow(db: TokenDatabase, userId: string, id: string, revokedAt: number): Promise<boolean> {
  const { meta } = await db
    .prepare("UPDATE mcp_tokens SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL")
    .bind(revokedAt, id, userId)
    .run();
  return (meta?.changes ?? 0) > 0;
}
