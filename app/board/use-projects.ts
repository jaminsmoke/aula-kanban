"use client";

import { useCallback, useEffect, useState } from "react";
import type { Project } from "./model";
import { request } from "./api";

type ProjectsResponse = { projects: Project[]; isOwner: boolean; isAdmin?: boolean };
const requestProjects = () => request<ProjectsResponse>("GET", undefined, "/api/projects");

/**
 * Proyectos accesibles para la cuenta y el proyecto activo de la URL.
 * @returns Proyectos, permisos de propietario/administrador y refresco.
 */
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [projectLoadError, setProjectLoadError] = useState("");
  const [hasProjectLink, setHasProjectLink] = useState(false);
  const [owner, setOwner] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [projectId, setProjectId] = useState("default");

  const applyProjects = useCallback((next: ProjectsResponse) => {
    const explicit = new URLSearchParams(window.location.search).get("project");
    const currentId = explicit || "default";
    if (!explicit && next.projects.length && !next.projects.some((item) => item.id === currentId)) {
      window.location.replace("/?project=" + encodeURIComponent(next.projects[0].id));
      return;
    }
    setProjects(next.projects);
    setOwner(next.isOwner);
    setAdmin(Boolean(next.isAdmin));
    setHasProjectLink(Boolean(explicit));
    setProjectsLoaded(true);
    setProjectId(currentId);
    setProjectLoadError("");
  }, []);

  const applyProjectsError = useCallback((error: unknown) => {
    setProjectsLoaded(true);
    setProjectLoadError((error as Error).message);
  }, []);

  const refreshProjects = useCallback(async () => {
    try { applyProjects(await requestProjects()); }
    catch (error) { applyProjectsError(error); }
  }, [applyProjects, applyProjectsError]);

  useEffect(() => {
    let active = true;
    requestProjects().then(
      (next) => { if (active) applyProjects(next); },
      (error) => { if (active) applyProjectsError(error); },
    );
    const onFocus = () => { void refreshProjects(); };
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [applyProjects, applyProjectsError, refreshProjects]);

  const activeProject = projects.find((item) => item.id === projectId);

  return {
    projects, projectsLoaded, projectLoadError, hasProjectLink, owner, admin, projectId,
    activeProject, activeProjectId: activeProject?.id, refreshProjects,
  };
}
