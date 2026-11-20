import { cookies } from "next/headers";
import { DEMO_COOKIE, DEMO_USER } from "../../domain/demo";
import type { ChatGPTUser } from "../access/auth-user";

/** Cuenta fija que representa la demo de solo lectura. */
export const demoUser: ChatGPTUser = {
  userId: DEMO_USER.userId,
  email: DEMO_USER.email,
  displayName: DEMO_USER.displayName,
  fullName: DEMO_USER.fullName,
};

/**
 * Comprueba si la petición activó la demo con su cookie.
 * La cookie no es una credencial: solo enciende una identidad fija y de
 * solo lectura, y nunca sustituye a una sesión real de Sites.
 * @returns `true` cuando la cookie `__demo` vale `1`.
 */
export async function isDemoRequested(): Promise<boolean> {
  try {
    return (await cookies()).get(DEMO_COOKIE)?.value === "1";
  } catch {
    // Fuera de una petición (por ejemplo, en una prueba aislada) no hay demo.
    return false;
  }
}
