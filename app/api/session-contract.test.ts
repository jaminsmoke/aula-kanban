import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatGPTUser } from "../../lib/server/auth";

const mocks = vi.hoisted(() => ({
  user: null as ChatGPTUser | null,
  status: "ok" as "ok" | "unauthenticated" | "forbidden" | "not_found" | "invalid",
  owner: false,
  admin: false,
  read: vi.fn(),
}));

const currentUser: ChatGPTUser = {
  userId: "u1",
  displayName: "Docente",
  email: "docente@example.com",
  fullName: null,
};

vi.mock("../../lib/server/auth", () => ({ getChatGPTUser: async () => mocks.user }));
vi.mock("../../lib/server/project-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/server/project-access")>();
  return {
    ...actual,
    resolveProject: async () => mocks.status === "ok"
      ? { status: "ok", project: { id: "p1", name: "Proyecto", createdAt: 1, access: { user: currentUser, role: "student", studentSection: null, teacherId: null } } }
      : { status: mocks.status },
    isOwner: () => mocks.owner,
    isAdministrator: async () => mocks.admin,
  };
});
vi.mock("../../lib/server/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/server/storage")>()),
  readUpload: mocks.read,
}));

import { GET as administratorsGET } from "./administrators/route";
import { GET as appDocumentsGET } from "./app-documents/route";
import { GET as boardsGET } from "./boards/route";
import { GET as fileGET } from "./files/[id]/route";
import { GET as invitationsGET } from "./invitations/route";
import { GET as membersGET } from "./members/route";
import { GET as projectsGET, POST as projectsPOST } from "./projects/route";
import { GET as spaceAppsGET } from "./space-apps/route";
import { GET as studentsGET } from "./students/route";
import { GET as tasksGET } from "./tasks/route";
import { GET as teachersGET } from "./teachers/route";
import { POST as uploadsPOST } from "./uploads/route";

const get = (path: string) => new Request(`https://site.test${path}`);
const jsonRequest = (path: string, body: unknown) => new Request(`https://site.test${path}`, {
  method: "POST",
  headers: { origin: "https://site.test", "content-type": "application/json" },
  body: JSON.stringify(body),
});
const fileRequest = () => new Request("https://site.test/api/files/file1");
const uploadRequest = () => new Request("https://site.test/api/uploads?project=p1", {
  method: "POST",
  headers: { origin: "https://site.test" },
});

const scopedRoutes = [
  ["tasks", () => tasksGET(get("/api/tasks?project=p1"))],
  ["students", () => studentsGET(get("/api/students?project=p1"))],
  ["teachers", () => teachersGET(get("/api/teachers?project=p1"))],
  ["members", () => membersGET(get("/api/members?project=p1"))],
  ["boards", () => boardsGET(get("/api/boards?project=p1"))],
  ["space-apps", () => spaceAppsGET(get("/api/space-apps?project=p1"))],
  ["app-documents", () => appDocumentsGET(get("/api/app-documents?project=p1&app=blockly"))],
  ["files", () => fileGET(fileRequest(), { params: Promise.resolve({ id: "file1" }) })],
] as const;

describe("contrato de respuestas sin sesión", () => {
  beforeEach(() => {
    mocks.user = null;
    mocks.status = "unauthenticated";
    mocks.owner = false;
    mocks.admin = false;
    mocks.read.mockReset().mockResolvedValue({ status: "ok", row: { projectId: "p1" }, object: { body: new Blob(["x"]) } });
  });

  it("responde 401 en todas las rutas sin sesión", async () => {
    for (const [name, call] of scopedRoutes) {
      expect((await call()).status, name).toBe(401);
    }
    expect((await projectsGET()).status).toBe(401);
    expect((await projectsPOST(jsonRequest("/api/projects", { id: "p", name: "Proyecto" }))).status).toBe(401);
    expect((await administratorsGET()).status).toBe(401);
    expect((await invitationsGET()).status).toBe(401);
    expect((await uploadsPOST(uploadRequest())).status).toBe(401);
  });

  it("responde 403 a una cuenta autenticada sin acceso", async () => {
    mocks.user = currentUser;
    mocks.status = "forbidden";
    for (const [name, call] of scopedRoutes) {
      expect((await call()).status, name).toBe(403);
    }
    expect((await uploadsPOST(uploadRequest())).status).toBe(403);
  });

  it("responde 404 cuando el proyecto no existe", async () => {
    mocks.user = currentUser;
    mocks.status = "not_found";
    for (const [name, call] of scopedRoutes) {
      expect((await call()).status, name).toBe(404);
    }
    expect((await uploadsPOST(uploadRequest())).status).toBe(404);
  });

  it("mantiene el 403 de permisos en rutas sin proyecto", async () => {
    mocks.user = currentUser;
    expect((await projectsPOST(jsonRequest("/api/projects", { id: "p", name: "Proyecto" }))).status).toBe(403);
    expect((await administratorsGET()).status).toBe(403);
  });
});
