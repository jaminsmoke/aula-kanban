"use client";

import { useCallback, useEffect, useState } from "react";
import type { Project } from "../shared/model";
import { request } from "../shared/api";

type ProjectsResponse = { projects: Project[]; isOwner: boolean; isAdmin?: boolean; legacyProjectId?: string | null };
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
    const params = new URLSearchParams(window.location.search);
    const explicit = params.get("project");
    if (explicit === "default" && next.legacyProjectId && next.projects.some((project) => project.id === next.legacyProjectId)) {
      params.set("project", next.legacyProjectId);
      window.location.replace(`/?${params.toString()}`);
      return;
    }
    const currentId = explicit || "default";
    if (!explicit && next.projects.length && !next.projects.some((item) => item.id === currentId)) {
      params.set("project", next.projects[0].id);
      window.location.replace(`/?${params.toString()}`);
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
