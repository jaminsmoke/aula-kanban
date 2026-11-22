import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Board from "./board";
import type { BoardUrlState } from "./board/shared/board-url";

const mocks = vi.hoisted(() => {
  const taskA = {
    id: "t1",
    title: "Investigar placas",
    description: "",
    imageUrl: "",
    assignee: "",
    assignees: [],
    dueDate: "",
    priority: "normal",
    status: "pending",
    createdAt: 1,
    revision: 0,
  };
  const taskB = {
    id: "t2",
    title: "Preparar exposición",
    description: "",
    imageUrl: "",
    assignee: "",
    assignees: [],
    dueDate: "",
    priority: "normal",
    status: "pending",
    createdAt: 2,
    revision: 0,
  };
  return { taskA, taskB, currentTask: taskA, tasks: [] as typeof taskA[], openEditor: vi.fn(), setEditor: vi.fn() };
});

vi.mock("./board/layout/header", () => ({
  default: ({ view }: { view: string }) => <header data-testid="board-header">{view}</header>,
}));
vi.mock("./board/class/class-view", () => ({
  default: () => <section aria-label="Clase">Clase</section>,
}));
vi.mock("./board/people/administration/administration-view", () => ({
  default: ({ onAppClose }: { onAppClose?: (appId: string) => void }) => (
    <button type="button" onClick={() => onAppClose?.("aula-documentos")}>Cerrar Aula Documentos</button>
  ),
}));
vi.mock("./board/tasks/dialog/task-dialog", () => ({
  default: ({ onOpenDocument }: { onOpenDocument?: (documentId: string) => void }) => (
    <button type="button" onClick={() => onOpenDocument?.("doc1")}>Abrir documento</button>
  ),
}));
vi.mock("./board/projects/use-projects", () => ({
  useProjects: () => ({
    activeProject: { id: "p1", role: "teacher", teacherId: "teacher-1" },
    projects: [],
    projectId: "p1",
    projectsLoaded: true,
    projectLoadError: "",
    owner: false,
    admin: false,
    hasProjectLink: true,
    refreshProjects: vi.fn(),
  }),
}));
vi.mock("./board/projects/use-invitations", () => ({
  useInvitations: () => ({
    invitations: [],
    invitationsLoaded: true,
    invitationLoadError: "",
    invitationBusy: false,
    invitationError: "",
    acceptInvitation: vi.fn(),
    refreshInvitations: vi.fn(),
  }),
}));
vi.mock("./board/shared/use-board-data", () => ({
  useBoardData: () => ({
    tasks: mocks.tasks,
    setTasks: vi.fn(),
    students: [],
    teachers: [],
    allPeople: [],
    ownStudent: undefined,
    loadError: "",
    studentError: "",
    refresh: vi.fn(),
    refreshStudents: vi.fn(),
    writingRef: { current: false },
    studentWritingRef: { current: false },
  }),
}));
vi.mock("./board/projects/use-project-actions", () => ({
  useProjectActions: () => ({
    projectError: "",
    newProject: null,
    projectDeleting: null,
    projectSaving: false,
    deleteProjectName: "",
    openNewProject: vi.fn(),
    openShare: vi.fn(),
    openDeleteProject: vi.fn(),
    closeNewProject: vi.fn(),
    closeDeleteProject: vi.fn(),
    createProject: vi.fn(),
    deleteProject: vi.fn(),
    setNewProject: vi.fn(),
    setDeleteProjectName: vi.fn(),
  }),
}));
vi.mock("./board/tasks/use-tasks", () => ({
  useTasks: () => ({
    editor: { task: mocks.currentTask, status: "pending" },
    setEditor: mocks.setEditor,
    form: mocks.currentTask,
    setForm: vi.fn(),
    formError: "",
    saving: false,
    deleting: false,
    setDeleting: vi.fn(),
    openEditor: mocks.openEditor,
    mutate: vi.fn(),
    submit: vi.fn(),
    canEditTask: () => true,
    claiming: false,
    visible: [],
    filtered: false,
    total: 0,
    finished: 0,
    progress: 0,
    search: "",
    filter: "",
    studentFilter: "",
    setSearch: vi.fn(),
    setFilter: vi.fn(),
    setStudentFilter: vi.fn(),
    dragged: null,
    destination: null,
    canGrabTask: () => true,
    handleDragStart: vi.fn(),
    handleDragOver: vi.fn(),
    handleDragEnd: vi.fn(),
    handleDragCancel: vi.fn(),
    addAssignee: vi.fn(),
    removeAssignee: vi.fn(),
    chooseAssignee: vi.fn(),
    assignWholeClass: vi.fn(),
    removeWholeClass: vi.fn(),
  }),
}));
vi.mock("./board/tasks/use-task-documents", () => ({
  useTaskDocuments: () => ({ documents: [], loading: false, error: "" }),
}));
vi.mock("./board/people/students/use-students", () => ({
  useStudents: () => ({
    studentForm: null,
    studentDeleting: null,
    studentFormError: "",
    studentSaving: false,
    openNewStudent: vi.fn(),
    openEditStudent: vi.fn(),
    openRemoveStudent: vi.fn(),
    deleteStudent: vi.fn(),
    setStudentForm: vi.fn(),
    setStudentDeleting: vi.fn(),
  }),
}));

const initial: BoardUrlState = {
  view: "clase",
  classSection: "calendario",
  settingsSection: "cuenta",
  administracionSection: "alumnos",
  app: null,
};

beforeEach(() => {
  mocks.currentTask = mocks.taskA;
  mocks.tasks = [mocks.taskA];
  window.history.replaceState({}, "", "/?project=p1&section=calendario");
});

afterEach(() => {
  window.history.replaceState({}, "", "/");
  vi.clearAllMocks();
});

describe("Board TASK-02", () => {
  it("abre Aula Documentos desde la ficha editable y vuelve a la tarea con su vista de origen", async () => {
    render(<Board user={{ displayName: "Marta", email: "marta@example.com" }} initial={initial} />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir documento" }));
    await waitFor(() => expect(window.location.search).toContain("doc=doc1"));

    fireEvent.click(await screen.findByRole("button", { name: "Cerrar Aula Documentos" }));

    expect(mocks.openEditor).toHaveBeenCalledWith("pending", mocks.taskA);
    await waitFor(() => {
      expect(window.location.search).not.toContain("doc=doc1");
      expect(window.location.search).toContain("section=calendario");
    });
  });

  it("no duplica la vuelta a la ficha si se pulsa Abrir documento tres veces", async () => {
    render(<Board user={{ displayName: "Marta", email: "marta@example.com" }} initial={initial} />);

    const open = screen.getByRole("button", { name: "Abrir documento" });
    fireEvent.click(open);
    fireEvent.click(open);
    fireEvent.click(open);
    await waitFor(() => expect(window.location.search).toContain("doc=doc1"));

    fireEvent.click(await screen.findByRole("button", { name: "Cerrar Aula Documentos" }));

    expect(mocks.openEditor).toHaveBeenCalledTimes(1);
    expect(mocks.openEditor).toHaveBeenCalledWith("pending", mocks.taskA);
  });

  it("vuelve a abrir la ficha y cierra la segunda tarea seleccionada", async () => {
    const view = render(<Board user={{ displayName: "Marta", email: "marta@example.com" }} initial={initial} />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir documento" }));
    await waitFor(() => expect(window.location.search).toContain("doc=doc1"));
    fireEvent.click(await screen.findByRole("button", { name: "Cerrar Aula Documentos" }));
    expect(mocks.openEditor).toHaveBeenLastCalledWith("pending", mocks.taskA);

    mocks.currentTask = mocks.taskB;
    mocks.tasks = [mocks.taskB];
    view.rerender(<Board user={{ displayName: "Marta", email: "marta@example.com" }} initial={initial} />);
    fireEvent.click(await screen.findByRole("button", { name: "Abrir documento" }));
    await waitFor(() => expect(window.location.search).toContain("doc=doc1"));
    fireEvent.click(await screen.findByRole("button", { name: "Cerrar Aula Documentos" }));

    expect(mocks.openEditor).toHaveBeenLastCalledWith("pending", mocks.taskB);
  });

  it("vuelve con la revisión actual si la tarea cambió mientras Aula Documentos estaba abierto", async () => {
    const view = render(<Board user={{ displayName: "Marta", email: "marta@example.com" }} initial={initial} />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir documento" }));
    await waitFor(() => expect(window.location.search).toContain("doc=doc1"));

    mocks.tasks = [{ ...mocks.taskA, status: "in_progress", revision: 2 }];
    view.rerender(<Board user={{ displayName: "Marta", email: "marta@example.com" }} initial={initial} />);
    fireEvent.click(await screen.findByRole("button", { name: "Cerrar Aula Documentos" }));

    expect(mocks.openEditor).toHaveBeenLastCalledWith("in_progress", expect.objectContaining({ id: "t1", revision: 2 }));
  });
});
