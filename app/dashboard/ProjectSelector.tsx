"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Project } from "@/lib/types/database";

interface ProjectSelectorProps {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function ProjectSelector({ projects, selectedId, onSelect }: ProjectSelectorProps) {
  if (projects.length === 0) {
    return (
      <p className="text-sm text-slate-400">No projects available for your department.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Project</Label>
      <Select
        value={selectedId ?? ""}
        onValueChange={(value) => onSelect(value || null)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
