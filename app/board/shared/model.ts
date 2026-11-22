import { CircleCheck, CircleDashed, Clock3, ScanEye } from "lucide-react";
import type { TaskFields } from "../../../lib/domain/task";

export const columns = {
  pending: { name: "Por hacer", icon: CircleDashed },
  active: { name: "En curso", icon: Clock3 },
  review: { name: "En revisión", icon: ScanEye },
  done: { name: "Hecho", icon: CircleCheck },
};

export const blank: TaskFields = {
  title: "", description: "", imageUrl: "", assignee: "", assignees: [], dueDate: "", priority: "normal", status: "pending", documentId: null,
};

export const formatDate = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });

/**
 * Calcula las iniciales en mayúsculas de un nombre.
 * @param name - Nombre de la persona.
 * @returns Las dos primeras iniciales, o vacías sin nombre.
 */
export const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

export type Project = { id: string; name: string; createdAt: number; role: "owner" | "admin" | "teacher" | "student" | "guest"; studentSection: string | null; teacherId: string | null };
export type Member = { id: string; email: string; role: "teacher" | "student" | "guest"; studentSection: string | null; teacherId: string | null; status: "pending" | "active" };
export type Invitation = { id: string; projectId: string | null; projectName: string; role: "teacher" | "student" | "guest" | "admin"; scope: "project" | "site" };
export type Administrator = { id: string; displayName: string; email: string; revision: number; accountStatus: "active" | "pending" | "unlinked"; active: boolean };

/**
 * Etiqueta legible del estado de la cuenta de una ficha.
 * @param status - Estado (`active`, `pending` u otro/`unlinked`).
 * @returns Texto para tarjetas, fichas y listas de cuentas.
 */
export const accountLabel = (status?: string) => status === "active" ? "Cuenta activa" : status === "pending" ? "Invitación pendiente" : "Sin correo: cuenta inactiva";
