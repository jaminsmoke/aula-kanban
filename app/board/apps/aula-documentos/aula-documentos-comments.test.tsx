import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AulaDocumentComment } from "../../../../lib/domain/aula-documentos/revision";
import { props, resetAulaDocumentMocks, printMock, chooseMenu } from "../../../../test-utils/aula-documentos";
import AulaDocumentosApp from "./aula-documentos-app";

const rootComment: AulaDocumentComment = {
  id: "c1",
  projectId: "p1",
  documentId: "legacy",
  parentId: null,
  authorUserId: "u1",
  authorName: "Docente",
  body: "Revisar esta parte.",
  anchor: {
    from: 0,
    to: 0,
    quote: "Introducción",
    prefix: "",
    suffix: "",
    blockIndex: 0,
  },
  status: "open",
  createdAt: 1,
  updatedAt: 1,
  resolvedAt: null,
  resolvedBy: null,
  capabilities: { canEdit: true, canDelete: true, canResolve: true },
};

/**
 * Prepara respuestas de la API de comentarios en memoria.
 * @returns Espía de fetch.
 */
function stubComments() {
  const threads: Array<AulaDocumentComment & { replies: AulaDocumentComment[] }> = [
    { ...rootComment, replies: [] },
  ];
  let total = 1;
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/comments?")) {
      if (init?.method === "POST") {
        const payload = JSON.parse(String(init.body)) as { body: string; parentId?: string | null };
        const comment = {
          ...rootComment,
          id: `c${total + 1}`,
          body: payload.body,
          parentId: payload.parentId ?? null,
          createdAt: total + 1,
          updatedAt: total + 1,
        };
        if (payload.parentId) {
          const parent = threads.find((thread) => thread.id === payload.parentId);
          parent?.replies.push(comment);
        } else {
          threads.push({ ...comment, replies: [] });
        }
        total += 1;
        return Response.json({ comment }, { status: 201 });
      }
      return Response.json({ threads, total });
    }
    if (url.includes("/comments/c1")) {
      const thread = threads[0];
      thread.status = "resolved";
      thread.capabilities = { ...thread.capabilities, canResolve: true };
      return Response.json({ comment: thread });
    }
    return Response.json({ message: "No encontrado." }, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("comentarios de Aula Documentos", () => {
  afterEach(resetAulaDocumentMocks);

  it("abre el panel, crea un comentario, responde y resuelve", async () => {
    stubComments();
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Comentarios del documento" }));
    expect(await screen.findByRole("complementary", { name: "Comentarios del documento" })).toBeTruthy();
    expect(await screen.findByText("Revisar esta parte.")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Nuevo comentario"), { target: { value: "Nuevo hallazgo." } });
    fireEvent.click(screen.getByRole("button", { name: "Publicar comentario" }));
    expect(await screen.findByText("Nuevo hallazgo.")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Responder" })[0]);
    fireEvent.change(screen.getByLabelText("Responder al comentario"), { target: { value: "De acuerdo." } });
    fireEvent.click(within(screen.getByLabelText("Responder al comentario").closest("div") as HTMLElement).getByRole("button", { name: "Responder" }));
    expect(await screen.findByText("De acuerdo.")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Resolver" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Todos" }));
    expect(await screen.findByText("Resuelto")).toBeTruthy();
  });

  it("abre y cierra comentarios con Ctrl+Alt+M dentro de Aula", async () => {
    stubComments();
    render(<AulaDocumentosApp {...props} />);
    const editor = await screen.findByLabelText("Contenido del documento");

    fireEvent.keyDown(editor, { key: "m", ctrlKey: true, altKey: true });
    expect(await screen.findByRole("complementary", { name: "Comentarios del documento" })).toBeTruthy();

    fireEvent.keyDown(editor, { key: "m", ctrlKey: true, altKey: true });
    await waitFor(() => expect(screen.queryByRole("complementary", { name: "Comentarios del documento" })).toBeNull());

    fireEvent.keyDown(document.body, { key: "m", ctrlKey: true, altKey: true });
    expect(screen.queryByRole("complementary", { name: "Comentarios del documento" })).toBeNull();
  });

  it("devuelve el foco al botón al cerrar el panel", async () => {
    stubComments();
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    const trigger = screen.getByRole("button", { name: "Comentarios del documento" });
    fireEvent.click(trigger);
    expect(await screen.findByRole("complementary", { name: "Comentarios del documento" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar comentarios" }));
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("deja el panel en lectura para invitados", async () => {
    stubComments();
    render(<AulaDocumentosApp projectId={props.projectId} role="guest" />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Comentarios del documento" }));
    expect(await screen.findByRole("complementary", { name: "Comentarios del documento" })).toBeTruthy();
    expect(screen.getByText("Puedes leer los comentarios, pero no escribir en ellos.")).toBeTruthy();
    expect(screen.queryByLabelText("Nuevo comentario")).toBeNull();
  });

  it("incluye comentarios en el PDF solo con la opción explícita", async () => {
    stubComments();
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Comentarios del documento" }));
    expect(await screen.findByText("Revisar esta parte.")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Incluir comentarios en HTML/PDF"));
    chooseMenu("Exportar", "Imprimir o guardar PDF");

    await waitFor(() => expect(printMock).toHaveBeenCalled());
    const html = printMock.mock.calls.at(-1)?.[0] as string;
    expect(html).toContain('<section class="comments">');
    expect(html).toContain("Revisar esta parte.");
  });
});
