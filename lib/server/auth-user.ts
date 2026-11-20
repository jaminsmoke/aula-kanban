/** Cuenta autenticada que comparten auth y los servicios del tablero. */
export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};
