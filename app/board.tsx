"use client";

import { FolderKanban, Plus, X } from "lucide-react";
import { Suspense, lazy, useState } from "react";
import BoardHeader, { type BoardView } from "./board/layout/header";
import KanbanView from "./board/tasks/kanban-view";
// Las vistas secundarias solo se descargan al abrirlas.
const TeachersView = lazy(() => import("./board/people/teachers/teachers-view"));
const StudentsView = lazy(() => import("./board/people/students-view"));
const SpaceView = lazy(() => import("./board/space/space-view"));
const DocumentationView = lazy(() => import("./board/docs/docs-view"));
import TaskDialog from "./board/tasks/task-dialog";
import SettingsDialog from "./board/layout/settings-dialog";
import MemberDialog from "./board/projects/member-dialog";
import { DeleteProjectDialog, NewProjectDialog, RemixDialog, ShareDialog } from "./board/projects/project-dialogs";
import { StudentDeleteDialog, StudentFormDialog } from "./board/people/student-dialogs";
import { useProjects } from "./board/projects/use-projects";
import { useInvitations } from "./board/projects/use-invitations";
import { useBoardData } from "./board/shared/use-board-data";
import { useProjectActions } from "./board/projects/use-project-actions";
import { useTasks } from "./board/tasks/use-tasks";
import { useStudents } from "./board/people/use-students";

const invitationRoleNames = { teacher: "Profesor", student: "Alumno", guest: "Invitado", admin: "Administrador" } as const;

/**
 * Tablero principal: cabecera, invitaciones y la vista activa.
 * @param props - Cuenta autenticada de ChatGPT.
 * @returns La aplicación completa del tablero.
 */
export default function Board({ user }: { user: { displayName: string; email: string } }) {
  const projectState = useProjects();
  const invitations = useInvitations();
  const data = useBoardData(projectState.activeProject);
  const actions = useProjectActions({ projects: projectState.projects, projectId: projectState.projectId });
  const [view, setView] = useState<BoardView>("kanban");
  const [studentName, setStudentName] = useState<string | null>(null);
  const [studentLayout, setStudentLayout] = useState<"grid" | "list">("grid");
  const [notice, setNotice] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [remixOpen, setRemixOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const activeProject = projectState.activeProject;
  const canManage = activeProject?.role === "owner" || activeProject?.role === "admin" || activeProject?.role === "teacher";
  const isGuest = activeProject?.role === "guest";
  const board = useTasks({ data, hasProject: Boolean(activeProject), canManage, isGuest, notify: setNotice });
  const people = useStudents({ data, openStudent: setStudentName, onStudentRemoved: board.clearStudentFilter, notify: setNotice });

  const accessReady = projectState.projectsLoaded && invitations.invitationsLoaded;
  const accessCheckError = projectState.projectLoadError || invitations.invitationLoadError;
  const requestedInvitation = invitations.invitations.find((invitation) => invitation.projectId === projectState.projectId);
  const invitationWelcome = Boolean(invitations.invitations.length && (!projectState.hasProjectLink || requestedInvitation || invitations.invitations.some((invitation) => invitation.scope === "site")));
  const orderedInvitations = requestedInvitation ? [requestedInvitation, ...invitations.invitations.filter((invitation) => invitation.id !== requestedInvitation.id)] : invitations.invitations;
  const privilegedOnboarding = (projectState.owner || projectState.admin) && !projectState.hasProjectLink && projectState.projects.length === 0 && invitations.invitations.length === 0;

  return (
    <>
      <BoardHeader
        user={user}
        activeProject={activeProject}
        projects={projectState.projects}
        projectId={projectState.projectId}
        view={view}
        onView={(next) => { setView(next); setNotice(""); if (next === "alumnos") setStudentName(null); }}
        owner={projectState.owner}
        admin={projectState.admin}
        canManage={Boolean(canManage)}
        onNewProject={actions.openNewProject}
        onShareProject={actions.openShare}
        onMembers={() => setMembersOpen(true)}
        onDeleteProject={actions.openDeleteProject}
        onRemix={() => setRemixOpen(true)}
        onSettings={() => setSettingsOpen(true)}
      />

      {settingsOpen && <SettingsDialog
        user={user}
        projectsLoaded={projectState.projectsLoaded}
        owner={projectState.owner}
        admin={projectState.admin}
        activeProject={activeProject}
        onClose={() => setSettingsOpen(false)}
        onProjectsChanged={() => void projectState.refreshProjects()}
      />}

      {remixOpen && <RemixDialog onClose={() => setRemixOpen(false)} />}

      <main className="shell">
        {activeProject && invitations.invitations.length > 0 && <section className="invitation-panel" aria-label="Invitaciones pendientes"><h2>Invitaciones pendientes</h2>{invitations.invitations.map((invitation) => <div className="invitation-row" key={invitation.id}><span><strong>{invitation.projectName}</strong> · {invitationRoleNames[invitation.role]}</span><button className="primary" disabled={invitations.invitationBusy} onClick={() => void invitations.acceptInvitation(invitation)}>Aceptar invitación</button></div>)}</section>}
        {activeProject && invitations.invitationLoadError && <div className="alert project-alert" role="alert">No se pudieron consultar las invitaciones. <button type="button" className="text-button" onClick={() => void invitations.refreshInvitations()}>Reintentar</button></div>}
        {activeProject && invitations.invitationError && <div className="alert" role="alert">{invitations.invitationError}</div>}
        {activeProject && actions.projectError && !actions.newProject && !actions.projectDeleting && <div role="alert" className="alert project-alert">{actions.projectError} <button type="button" className="text-button" onClick={() => void projectState.refreshProjects()}>Reintentar</button></div>}
        {!activeProject ? !accessReady ? <div className="access-loading" role="status">Comprobando tu acceso…</div> : accessCheckError ? (
          <section className="access-screen" aria-labelledby="access-error-title"><div className="access-card"><p className="eyebrow"><span /> Aula Kanban</p><h1 id="access-error-title">No hemos podido comprobar tu acceso</h1><p>Revisa tu conexión y vuelve a intentarlo para consultar tus proyectos e invitaciones.</p><button type="button" className="primary" onClick={() => { void projectState.refreshProjects(); void invitations.refreshInvitations(); }}>Reintentar</button></div></section>
        ) : privilegedOnboarding ? (
          <section className="access-screen" aria-labelledby="first-project-title"><div className="access-card"><p className="eyebrow"><span /> Aula Kanban</p><h1 id="first-project-title">Tu primer proyecto empieza aquí</h1><p>Crea un tablero para organizar las tareas y compartirlo con tu grupo.</p><button className="primary" type="button" onClick={actions.openNewProject}><Plus size={18} /> Nuevo proyecto</button></div></section>
        ) : (
          <section className="access-screen" aria-labelledby="access-title"><div className="access-card">
            <p className="eyebrow"><span /> Aula Kanban</p>
            <h1 id="access-title">{invitationWelcome ? "Tienes una invitación" : projectState.hasProjectLink ? "Este enlace no está disponible para tu cuenta" : "Aún no tienes acceso a un proyecto"}</h1>
            <p>{invitationWelcome ? "Acepta la invitación para continuar con esta cuenta de ChatGPT." : "Si te han invitado, comprueba que has iniciado sesión con la cuenta indicada o pide una invitación a quien gestione el proyecto."}</p>
            {invitations.invitations.length > 0 && <section className="access-invitations" aria-label="Invitaciones pendientes"><h2>{invitationWelcome ? "Invitaciones pendientes" : "También tienes invitaciones pendientes"}</h2>{orderedInvitations.map((invitation) => <div className="access-invitation" key={invitation.id}><span className="access-invitation-icon" aria-hidden><FolderKanban size={20} /></span><span className="access-invitation-info"><strong>{invitation.projectName}</strong><small>{invitationRoleNames[invitation.role]}</small></span><button className="primary" disabled={invitations.invitationBusy} onClick={() => void invitations.acceptInvitation(invitation)}>Aceptar invitación</button></div>)}</section>}
            {invitations.invitationError && <div className="alert" role="alert">{invitations.invitationError}</div>}
            <div className="access-remix"><div><strong>¿Quieres tu propio tablero?</strong><p>Solicita una copia independiente de Aula Kanban para personalizarla a tu manera.</p></div><button type="button" className={invitationWelcome ? "secondary" : "primary"} onClick={() => setRemixOpen(true)}><Plus size={18} /> Haz tu Site de Aula Kanban</button></div>
          </div></section>
        ) : view === "documentacion" ? (
          <Suspense fallback={<div className="access-loading" role="status">Cargando la documentación…</div>}>
            <DocumentationView onBack={() => setView("kanban")} />
          </Suspense>
        ) : view === "espacio" ? (
          <Suspense fallback={<div className="access-loading" role="status">Cargando Mi espacio…</div>}>
            <SpaceView role={activeProject.role} projectId={projectState.projectId} onExit={() => setView("kanban")} />
          </Suspense>
        ) : view === "profesores" ? (
          <Suspense fallback={<div className="access-loading" role="status">Cargando profesores…</div>}>
          <TeachersView key={projectState.projectId} projectId={projectState.projectId} isAdmin={projectState.owner || projectState.admin} ownTeacherId={activeProject.teacherId} tasks={data.tasks} students={data.students} openTask={(task) => board.openEditor(task.status, task)} />
          </Suspense>
        ) : view === "alumnos" ? (
          <Suspense fallback={<div className="access-loading" role="status">Cargando alumnos…</div>}>
          <StudentsView
            students={data.students}
            tasks={data.tasks}
            all={data.tasks ?? []}
            allPeople={data.allPeople}
            ownStudent={data.ownStudent}
            canManage={Boolean(canManage)}
            loadError={data.loadError}
            studentError={data.studentError}
            onRetryTasks={() => void data.refresh()}
            onRetryStudents={() => void data.refreshStudents()}
            studentName={studentName}
            onSelectStudent={setStudentName}
            layout={studentLayout}
            onLayout={setStudentLayout}
            onCreate={people.openNewStudent}
            onEdit={people.openEditStudent}
            onDelete={people.openRemoveStudent}
            onOpenTask={(task) => board.openEditor(task.status, task)}
          />
          </Suspense>
        ) : (
          <KanbanView
            tasks={data.tasks}
            visible={board.visible}
            students={data.students}
            search={board.search}
            filter={board.filter}
            studentFilter={board.studentFilter}
            onSearch={board.setSearch}
            onFilter={board.setFilter}
            onStudentFilter={board.setStudentFilter}
            loadError={data.loadError}
            onRetry={() => void data.refresh()}
            saving={board.saving}
            isGuest={Boolean(isGuest)}
            filtered={board.filtered}
            dragged={board.dragged}
            destination={board.destination}
            canEditTask={board.canEditTask}
            onOpenEditor={board.openEditor}
            canGrabTask={board.canGrabTask}
            onDragStart={board.handleDragStart}
            onDragOver={board.handleDragOver}
            onDragEnd={board.handleDragEnd}
            onDragCancel={board.handleDragCancel}
            finished={board.finished}
            total={board.total}
            progress={board.progress}
          />
        )}

        <div className={notice ? "toast" : "sr-only"} role="status">{notice}{notice && <button type="button" className="icon-button" onClick={() => setNotice("")} aria-label="Cerrar aviso"><X size={16} /></button>}</div>
      </main>

      {board.editor && <TaskDialog
        editor={board.editor}
        form={board.form}
        onForm={board.setForm}
        formError={board.formError}
        saving={board.saving}
        deleting={board.deleting}
        onDeleting={board.setDeleting}
        canManage={Boolean(canManage)}
        canEditTask={board.canEditTask}
        ownStudent={data.ownStudent}
        students={data.students}
        teachers={data.teachers}
        claiming={board.claiming}
        onAddAssignee={board.addAssignee}
        onRemoveAssignee={board.removeAssignee}
        onAssignee={board.chooseAssignee}
        onAssignClass={board.assignWholeClass}
        onRemoveClass={board.removeWholeClass}
        onSubmit={board.submit}
        onClose={() => { if (!data.writingRef.current) board.setEditor(null); }}
        onDelete={(task) => void board.mutate("DELETE", { id: task.id, revision: task.revision }, "Tarea eliminada.", true)}
      />}

      {people.studentForm && <StudentFormDialog
        student={people.studentForm}
        onChange={people.setStudentForm}
        error={people.studentFormError}
        saving={people.studentSaving}
        onSubmit={people.saveStudent}
        onClose={() => { if (!data.studentWritingRef.current) people.setStudentForm(null); }}
      />}

      {people.studentDeleting && <StudentDeleteDialog
        student={people.studentDeleting}
        error={people.studentFormError}
        saving={people.studentSaving}
        onClose={() => { if (!data.studentWritingRef.current) people.setStudentDeleting(null); }}
        onConfirm={() => void people.deleteStudent()}
      />}

      {actions.newProject && <NewProjectDialog
        project={actions.newProject}
        onChange={actions.setNewProject}
        error={actions.projectError}
        saving={actions.projectSaving}
        onSubmit={actions.createProject}
        onClose={actions.closeNewProject}
      />}

      {actions.projectDeleting && activeProject && <DeleteProjectDialog
        project={activeProject}
        name={actions.deleteProjectName}
        onName={actions.setDeleteProjectName}
        error={actions.projectError}
        saving={actions.projectSaving}
        onSubmit={actions.submitDelete}
        onClose={actions.closeDeleteProject}
      />}

      {membersOpen && <MemberDialog
        students={data.students}
        teachers={data.teachers}
        owner={projectState.owner}
        admin={projectState.admin}
        onClose={() => setMembersOpen(false)}
        onChanged={() => { void data.refreshStudents(); void data.refreshTeachers(); }}
      />}

      {actions.shareUrl && <ShareDialog
        url={actions.shareUrl}
        projectName={projectState.projects.find((project) => project.id === projectState.projectId)?.name ?? ""}
        onClose={actions.closeShare}
      />}
    </>
  );
}
