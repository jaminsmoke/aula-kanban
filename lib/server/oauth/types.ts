/** Interface mínima D1 del servicio (igual patrón que `TokenDatabase` en tests). */
export type Db = {
  prepare(sql: string): {
    bind(...params: Array<string | number | bigint | Uint8Array | null>): {
      first<T = unknown>(): Promise<T | null>;
      all<T = unknown>(): Promise<{ results: T[] }>;
      run(): Promise<{ meta?: { changes?: number } | undefined }>;
    };
  };
  batch(statements: Array<{ run(): Promise<unknown> }>): Promise<unknown[]>;
};

export const OAUTH_SCOPES = ["mcp:read", "mcp:write"] as const;
export type OAuthScope = (typeof OAUTH_SCOPES)[number];
export const SUPPORTED_SCOPES = OAUTH_SCOPES.join(" ");
export const ALL_SCOPES = OAUTH_SCOPES.join(" ");

export const CODE_TTL_MS = 10 * 60 * 1000;
export const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const TOKEN_PREFIX = "ak_oauth_";
export const CODE_PREFIX = "ak_oc_";

/** Error OAuth con el `error` y `error_description` de RFC 6749 §5.2. */
export type OAuthError = { error: string; error_description: string };

export type OAuthUser = { userId: string; email: string };

/** Cliente OAuth registrado (RFC 7591), sin secretos en claro. */
export type OAuthClient = {
  clientId: string;
  redirectUris: string[];
  scopes: string[];
  clientName: string;
};

/** Token verificado con la cuenta, el cliente y el alcance para el resource server. */
export type OAuthAccessToken = OAuthUser & {
  tokenId: string;
  clientId: string;
  scope: string;
  resource: string;
  expiresAt: number;
};

export type TokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
};
