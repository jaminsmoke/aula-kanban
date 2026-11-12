declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    BOARD_ROOMS?: DurableObjectNamespace;
    OWNER_EMAIL?: string;
  }
}
