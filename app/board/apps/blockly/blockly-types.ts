/** Lenguaje del panel de código. */
export type CodeTab = "javascript" | "python";

/** Resultado de ejecutar el programa en el worker. */
export type RunResult = { kind: "ok" | "error" | "timeout"; logs: string[]; message?: string };
