export type Student = {
  section: string;
  name: string;
  displayName: string;
  role: string;
  activities: string;
  aiHelp: string;
  revision: number;
  accountStatus?: "pending" | "active" | "unlinked";
  accountEmail?: string;
  accountMemberId?: string | null;
};
