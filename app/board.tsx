"use client";

import { FolderKanban, Plus, X } from "lucide-react";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import BoardHeader from "./board/layout/header";
import ClassView from "./board/class/class-view";
// Las vistas secundarias solo se descargan al abrirlas.
const AdministrationView = lazy(() => import("./board/people/administration/administration-view"));
const SettingsView = lazy(() => import("./board/settings/settings-view"));
import TaskDialog from "./board/tasks/dialog/task-dialog";
import MemberDialog from "./board/projects/member-dialog";
import { DeleteProjectDialog, NewProjectDialog, RemixDialog, ShareDialog } from "./board/projects/project-dialogs";
import { StudentDeleteDialog, StudentFormDialog } from "./board/people/students/student-dialogs";
import { useProjects } from "./board/projects/use-projects";
import { useInvitations } from "./board/projects/use-invitations";
import { useBoardData } from "./board/shared/use-board-data";
import { useProjectActions } from "./board/projects/use-project-actions";
import { useTasks } from "./board/tasks/use-tasks";
import { useStudents } from "./board/people/students/use-students";
import { useBoardUrlState } from "./board/shared/use-board-url";
import type { BoardUrlState } from "./board/shared/board-url";

const invitationRoleNames = { teacher: "Profesor", student: "Alumno", guest: "Invitado", admin: "Administrador" } as const;

/**
 * Tablero principal: cabecera, invitaciones y la vista activa.
 * @param props - Cuenta autenticada de ChatGPT y estado inicial de la URL.
 * @returns La aplicación completa del tablero.
 */
export default function Board({ user, initial, demo = false, demoSignInHref = "/signin-with-chatgpt?return_to=%2F" }: { user: { displayName: string; email: string }; initial?: BoardUrlState; demo?: boolean; demoSignInHref?: string }) {
  const projectState = useProjects();
  const invitations = useInvitations();
  const data = useBoardData(projectState.activeProject);
  const actions = useProjectActions({ projects: projectState.projects, projectId: projectState.projectId });
  const { view, setView, classSection, setClassSection, settingsSection, setSettingsSection, administracionSection, setAdministracionSection } = useBoardUrlState(initial);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [studentLayout, setStudentLayout] = useState<"grid" | "list">("grid");
  const [notice, setNotice] = useState("");
  const [remixOpen, setRemixOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const activeProject = projectState.activeProject;
  const canManage = activeProject?.role === "owner" || activeProject?.role === "admin" || activeProject?.role === "teacher";
  const isGuest = activeProject?.role === "guest";
  const board = useTasks({ data, hasProject: Boolean(activeProject), canManage, isGuest, notify: setNotice });
  const people = useStudents({ data, openStudent: setStudentName, onStudentRemoved: board.clearStudentFilter, notify: setNotice });
  const preselectedStudent = useRef<string | null>(null);

  // El alumnado entra en Administración > Alumnos con su propia ficha abierta.
  // Se hace una vez por proyecto y ficha: volver a la lista no la reabre.
  useEffect(() => {
    if (view !== "administracion" || administracionSection !== "alumnos" || activeProject?.role !== "student") return;
    const own = data.ownStudent?.section;
    if (!own) return;
    const key = `${activeProject.id}:${own}`;
    if (preselectedStudent.current === key) return;
    preselectedStudent.current = key;
    setStudentName(own);
  }, [view, administracionSection, activeProject, data.ownStudent]);

  const accessReady = projectState.projectsLoaded && invitations.invitationsLoaded;
  const accessCheckError = projectState.projectLoadError || invitations.invitationLoadError;
  const requestedInvitation = invitations.invitations.find((invitation) => invitation.projectId === projectState.projectId);
  const invitationWelcome = Boolean(invitations.invitations.length && (!projectState.hasProjectLink || requestedInvitation || invitations.invitations.some((invitation) => invitation.scope === "site")));
  const orderedInvitations = requestedInvitation ? [requestedInvitation, ...invitations.invitations.filter((invitation) => invitation.id !== requestedInvitation.id)] : invitations.invitations;
  const privilegedOnboarding = (projectState.owner || projectState.admin) && !projectState.hasProjectLink && projectState.projects.length === 0 && invitations.invitations.length === 0;

  return (
    <div className={`app-frame${view === "ajustes" || view === "administracion" || (activeProject && view === "clase") ? " app-frame--viewport" : ""}`}>
      <BoardHeader
        user={user}
        demo={demo}
        activeProject={activeProject}
        projects={projectState.projects}
        projectId={projectState.projectId}
        view={view}
        classSection={classSection}
        settingsSection={settingsSection}
        administracionSection={administracionSection}
        onView={(next) => { setView(next); setNotice(""); if (next === "administracion") setStudentName(null); }}
        owner={projectState.owner}
        admin={projectState.admin}
        canManage={Boolean(canManage)}
        onNewProject={actions.openNewProject}
        onShareProject={actions.openShare}
        onMembers={() => setMembersOpen(true)}
        onDeleteProject={actions.openDeleteProject}
        onSettings={() => setView("ajustes")}
      />

      {demo && (
        <div className="demo-banner" role="note">
          <span className="demo-banner-badge">Demo</span>
          <p><strong>Estás viendo una demo.</strong> Datos ficticios y solo lectura.</p>
          <a className="demo-banner-link" href={demoSignInHref} target="_top">Entrar con ChatGPT</a>
        </div>
      )}

      {remixOpen && <RemixDialog onClose={() => setRemixOpen(false)} />}

      <main className={view === "ajustes" || view === "administracion" || (activeProject && view === "clase") ? "workspace-main" : "shell"}>
        {activeProject && invitations.invitations.length > 0 && <section className="invitation-panel" aria-label="Invitaciones pendientes"><h2>Invitaciones pendientes</h2>{invitations.invitations.map((invitation) => <div className="invitation-row" key={invitation.id}><span><strong>{invitation.projectName}</strong> · {invitationRoleNames[invitation.role]}</span><button className="primary" disabled={invitations.invitationBusy} onClick={() => void invitations.acceptInvitation(invitation)}>Aceptar invitación</button></div>)}</section>}
        {activeProject && invitations.invitationLoadError && <div className="alert project-alert" role="alert">No se pudieron consultar las invitaciones. <button type="button" className="text-button" onClick={() => void invitations.refreshInvitations()}>Reintentar</button></div>}
        {activeProject && invitations.invitationError && <div className="alert" role="alert">{invitations.invitationError}</div>}
        {activeProject && actions.projectError && !actions.newProject && !actions.projectDeleting && <div role="alert" className="alert project-alert">{actions.projectError} <button type="button" className="text-button" onClick={() => void projectState.refreshProjects()}>Reintentar</button></div>}
        {view === "ajustes" ? (
          <Suspense fallback={<div className="access-loading" role="status">Cargando ajustes…</div>}>
            <SettingsView
              user={user}
              projectsLoaded={projectState.projectsLoaded}
              owner={projectState.owner}
              admin={projectState.admin}
              guest={Boolean(isGuest)}
              activeProject={activeProject}
              onProjectsChanged={() => void projectState.refreshProjects()}
              onRemix={() => setRemixOpen(true)}
              section={settingsSection}
              onSection={setSettingsSection}
            />
          </Suspense>
        ) : !activeProject ? !accessReady ? <div className="access-loading" role="status">Comprobando tu acceso…</div> : accessCheckError ? (
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
        ) : view === "administracion" ? (
          <Suspense fallback={<div className="access-loading" role="status">Cargando administración…</div>}>
            <AdministrationView
              key={projectState.projectId}
              section={administracionSection}
              onSection={setAdministracionSection}
              tienda={{
                role: activeProject.role,
                projectId: projectState.projectId,
              }}
              students={{
                projectId: projectState.projectId,
                students: data.students,
                tasks: data.tasks,
                all: data.tasks ?? [],
                allPeople: data.allPeople,
                ownStudent: data.ownStudent,
                canManage: Boolean(canManage),
                loadError: data.loadError,
                studentError: data.studentError,
                onRetryTasks: () => void data.refresh(),
                onRetryStudents: () => void data.refreshStudents(),
                studentName,
                onSelectStudent: setStudentName,
                layout: studentLayout,
                onLayout: setStudentLayout,
                onCreate: people.openNewStudent,
                onEdit: people.openEditStudent,
                onDelete: people.openRemoveStudent,
                onOpenTask: (task) => board.openEditor(task.status, task),
              }}
              teachers={{
                projectId: projectState.projectId,
                isAdmin: projectState.owner || projectState.admin,
                canTools: Boolean(canManage),
                ownTeacherId: activeProject.teacherId,
                tasks: data.tasks,
                students: data.students,
                openTask: (task) => board.openEditor(task.status, task),
              }}
            />
          </Suspense>
        ) : (
          <ClassView
            section={classSection}
            onSection={setClassSection}
            role={activeProject.role}
            projectId={projectState.projectId}
            kanban={{
              tasks: data.tasks,
              visible: board.visible,
              students: data.students,
              search: board.search,
              filter: board.filter,
              studentFilter: board.studentFilter,
              onSearch: board.setSearch,
              onFilter: board.setFilter,
              onStudentFilter: board.setStudentFilter,
              loadError: data.loadError,
              onRetry: () => void data.refresh(),
              saving: board.saving,
              isGuest: Boolean(isGuest),
              filtered: board.filtered,
              dragged: board.dragged,
              destination: board.destination,
              canEditTask: board.canEditTask,
              onOpenEditor: board.openEditor,
              canGrabTask: board.canGrabTask,
              onDragStart: board.handleDragStart,
              onDragOver: board.handleDragOver,
              onDragEnd: board.handleDragEnd,
              onDragCancel: board.handleDragCancel,
              finished: board.finished,
              total: board.total,
              progress: board.progress,
            }}
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
    </div>
  );
}
