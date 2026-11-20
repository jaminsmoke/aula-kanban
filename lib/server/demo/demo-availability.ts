import { DEMO_PROJECT_ID } from "../../domain/demo";
import { findProject } from "../projects/project-access";

/**
 * Comprueba si la instancia tiene el proyecto de demostración.
 * Si la base no responde, la portada no ofrece un enlace que llevaría a un 404.
 * @returns `true` cuando el proyecto demo existe.
 */
export async function isDemoAvailable(): Promise<boolean> {
  try {
    return Boolean(await findProject(DEMO_PROJECT_ID));
  } catch {
    return false;
  }
}
