// Config-driven CRUD for the simple flat nested resources of an Inspection.
// Resources with special sub-actions (rooms, categories/elements, findings/measurements, photos)
// have their own explicit route files instead of going through this generic handler.

import { db } from "@/lib/db";
import {
  participantSchema,
  participantUpdateSchema,
  costCategorySchema,
  costCategoryUpdateSchema,
  costItemSchema,
  costItemUpdateSchema,
  recommendationSchema,
  recommendationUpdateSchema,
  signatureSchema,
  signatureUpdateSchema,
} from "@/lib/validation";
import type { ZodType } from "zod";

type ResourceConfig = {
  delegate: {
    findMany: (args: unknown) => Promise<unknown[]>;
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
    delete: (args: unknown) => Promise<unknown>;
    findUnique: (args: unknown) => Promise<unknown>;
  };
  createSchema: ZodType;
  updateSchema: ZodType;
  orderBy: Record<string, "asc" | "desc">;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function delegateFor(model: any): ResourceConfig["delegate"] {
  return model;
}

export const RESOURCE_MAP: Record<string, ResourceConfig> = {
  participants: {
    delegate: delegateFor(db.participant),
    createSchema: participantSchema,
    updateSchema: participantUpdateSchema,
    orderBy: { order: "asc" },
  },
  "cost-categories": {
    delegate: delegateFor(db.costCategory),
    createSchema: costCategorySchema,
    updateSchema: costCategoryUpdateSchema,
    orderBy: { order: "asc" },
  },
  "cost-items": {
    delegate: delegateFor(db.costItem),
    createSchema: costItemSchema,
    updateSchema: costItemUpdateSchema,
    orderBy: { order: "asc" },
  },
  recommendations: {
    delegate: delegateFor(db.recommendation),
    createSchema: recommendationSchema,
    updateSchema: recommendationUpdateSchema,
    orderBy: { order: "asc" },
  },
  signatures: {
    delegate: delegateFor(db.signature),
    createSchema: signatureSchema,
    updateSchema: signatureUpdateSchema,
    orderBy: { createdAt: "asc" },
  },
};

export type ResourceKey = keyof typeof RESOURCE_MAP;
