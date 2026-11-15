/**
 * Servicio del servidor de autorización OAuth (roadmap OAuth 2.1, Fase 1).
 *
 * Los secretos (client_secret, códigos y tokens) solo se guardan como hashes
 * SHA-256 con sal por registro, con el mismo patrón que `mcp_tokens`: el
 * valor completo se muestra una sola vez en el registro o en la respuesta de
 * token. Los tokens son opacos: `ak_oauth_<id>_<secreto>` para acceso y
 * refresco, y `ak_oc_<id>_<secreto>` para el código de autorización.
 *
 * La implementación se divide en tipos, criptografía, clientes, códigos y
 * tokens; este módulo conserva la superficie pública que consumen las rutas.
 */

export type {
  Db,
  OAuthScope,
  OAuthError,
  OAuthUser,
  OAuthClient,
  OAuthAccessToken,
  TokenResponse,
} from "./types";
export {
  SUPPORTED_SCOPES,
  ALL_SCOPES,
  CODE_TTL_MS,
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
} from "./types";
export {
  bytesToBase64Url,
  base64UrlToBytes,
  parsePrefixedToken,
  hashWithSalt,
  constantTimeEqual,
  newSecretMaterial,
  normalizeScopes,
  isValidRedirectUri,
  verifyPkceS256,
} from "./cripto";
export { registerClient, getClient, authenticateClient } from "./clientes";
export { createAuthorizationCode } from "./codigos";
export {
  exchangeAuthorizationCode,
  refreshAccessToken,
  verifyAccessToken,
  revokeToken,
} from "./tokens";
