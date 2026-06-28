"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AnimationOpts,
  Content,
  ExportOpts,
  SignatureProject,
} from "./types";

const DEFAULT_CONTENT: Content = {
  name: "Morgan Ellis",
  title: "Head of Product Design",
  company: "Northwind Studio",
  email: "morgan@northwind.studio",
  phone: "+1 (555) 018-2245",
  website: "northwind.studio",
  socials: [
    { type: "linkedin", url: "https://linkedin.com/in/morganellis" },
    { type: "twitter", url: "https://twitter.com/morganellis" },
    { type: "instagram", url: "https://instagram.com/morganellis" },
  ],
  photoSrc: undefined,
  logoSrc: undefined,
  accent: "#6366f1",
  textColor: "#1a1d24",
  verified: true,
};

const DEFAULT_ANIM: AnimationOpts = {
  strips: 5,
  stagger: 0.55,
  skew: 18,
  durationMs: 2600,
  loop: true,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
};

const DEFAULT_EXPORT: ExportOpts = {
  scale: 1,
  fps: 24,
  loop: true,
  quality: 10,
  holdMs: 1000,
};

const DEFAULT_PROJECT: SignatureProject = {
  content: DEFAULT_CONTENT,
  layoutId: "classic-right",
  animationId: "slice-reveal",
  animationOpts: DEFAULT_ANIM,
  export: DEFAULT_EXPORT,
};

interface ProjectState {
  project: SignatureProject;
  setContent: (patch: Partial<Content>) => void;
  setSocial: (index: number, patch: Partial<Content["socials"][number]>) => void;
  setLayout: (layoutId: string) => void;
  setAnimation: (animationId: string) => void;
  setAnimationOpts: (patch: Partial<AnimationOpts>) => void;
  setExport: (patch: Partial<ExportOpts>) => void;
  reset: () => void;
}

export const useProject = create<ProjectState>()(
  persist(
    (set) => ({
      project: DEFAULT_PROJECT,
      setContent: (patch) =>
        set((s) => ({
          project: { ...s.project, content: { ...s.project.content, ...patch } },
        })),
      setSocial: (index, patch) =>
        set((s) => {
          const socials = s.project.content.socials.map((soc, i) =>
            i === index ? { ...soc, ...patch } : soc
          );
          return {
            project: {
              ...s.project,
              content: { ...s.project.content, socials },
            },
          };
        }),
      setLayout: (layoutId) =>
        set((s) => ({ project: { ...s.project, layoutId } })),
      setAnimation: (animationId) =>
        set((s) => ({ project: { ...s.project, animationId } })),
      setAnimationOpts: (patch) =>
        set((s) => ({
          project: {
            ...s.project,
            animationOpts: { ...s.project.animationOpts, ...patch },
          },
        })),
      setExport: (patch) =>
        set((s) => ({
          project: { ...s.project, export: { ...s.project.export, ...patch } },
        })),
      reset: () => set({ project: DEFAULT_PROJECT }),
    }),
    {
      name: "animated-signature-studio",
      version: 3,
      // Backfill fields added after a project was first saved.
      migrate: (persisted: unknown) => {
        const s = persisted as { project?: SignatureProject } | undefined;
        if (s?.project) {
          s.project.content = { ...DEFAULT_CONTENT, ...s.project.content };
          s.project.animationOpts = {
            ...DEFAULT_ANIM,
            ...s.project.animationOpts,
          };
        }
        return s as never;
      },
    }
  )
);

export { DEFAULT_PROJECT };
