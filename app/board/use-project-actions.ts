"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Project } from "./model";
import { RequestError, request } from "./api";

export function useProjectActions({ projects, projectId }: { projects: Project[]; projectId: string }) {
  const [newProject, setNewProject] = useState<{ id: string; name: string } | null>(null);
  const [projectError, setProjectError] = useState("");
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectDeleting, setProjectDeleting] = useState(false);
  const [deleteProjectName, setDeleteProjectName] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const projectWriting = useRef(false);

  function openNewProject() {
    setProjectError("");
    setNewProject({ id: crypto.randomUUID(), name: "" });
  }

  function closeNewProject() {
    if (!projectWriting.current) setNewProject(null);
  }

  function openDeleteProject() {
    setDeleteProjectName("");
    setProjectError("");
    setProjectDeleting(true);
  }

  function closeDeleteProject() {
    if (!projectWriting.current) setProjectDeleting(false);
  }

  function openShare() {
    const url = new URL("/", window.location.origin);
    url.searchParams.set("project", projectId);
    setShareUrl(url.href);
  }

  function closeShare() {
    setShareUrl("");
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newProject || projectWriting.current) return;
    projectWriting.current = true;
    setProjectSaving(true);
    setProjectError("");
    try {
      const created = await request<Project>("POST", newProject, "/api/projects");
      window.location.assign(new URL("/?project=" + encodeURIComponent(created.id), window.location.origin).href);
    } catch (error) {
      setProjectError((error as Error).message);
      projectWriting.current = false;
      setProjectSaving(false);
    }
  }

  async function deleteProject() {
    const selected = projects.find((project) => project.id === projectId);
    if (!selected || deleteProjectName !== selected.name || projectWriting.current) return;
    projectWriting.current = true;
    setProjectSaving(true);
    setProjectError("");
    try {
      try {
        await request("DELETE", { id: projectId }, "/api/projects");
      } catch (error) {
        if (error instanceof RequestError && error.status < 500) throw error;
        await request("DELETE", { id: projectId }, "/api/projects");
      }
      window.location.assign(new URL("/", window.location.origin).href);
    } catch (error) {
      setProjectError((error as Error).message);
      projectWriting.current = false;
      setProjectSaving(false);
    }
  }

  function submitDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void deleteProject();
  }

  return {
    newProject, setNewProject, projectError, projectSaving, projectDeleting, deleteProjectName, setDeleteProjectName,
    shareUrl, openNewProject, closeNewProject, openDeleteProject, closeDeleteProject, openShare, closeShare,
    createProject, submitDelete,
  };
}
