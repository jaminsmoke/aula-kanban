import { request } from "../board/api";
import type { Teacher } from "./model";

const path = "/api/teachers";

export function listTeachers(projectId: string) {
  return request<Teacher[]>("GET", undefined, path, projectId).catch(() => {
    throw new Error("No se pudieron cargar los profesores.");
  });
}

export const saveTeacher = (projectId: string, method: "POST" | "PATCH" | "DELETE", body: unknown) =>
  request<Teacher>(method, body, path, projectId);
