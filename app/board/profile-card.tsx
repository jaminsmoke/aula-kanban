import { ArrowRight } from "lucide-react";
import { accountLabel, initials } from "./model";

/**
 * Tarjeta de una ficha con nombre, puesto y estado de la cuenta.
 * @param props - Nombre visible, puesto, estado de la cuenta y apertura del detalle.
 * @returns La tarjeta como botón.
 */
export default function ProfileCard({ name, role, accountStatus, onOpen }: {
  name: string;
  role: string;
  accountStatus?: "pending" | "active" | "unlinked";
  onOpen: () => void;
}) {
  return <button type="button" className="student-card" onClick={onOpen}>
    <span className="student-avatar">{initials(name)}</span>
    <span><strong>{name}</strong><small>{role || "Puesto sin especificar"}</small><small className={`account-status ${accountStatus ?? "unlinked"}`}>{accountLabel(accountStatus)}</small></span>
    <ArrowRight size={17} />
  </button>;
}
