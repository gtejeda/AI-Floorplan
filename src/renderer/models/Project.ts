/**
 * Project Model
 * Root container for complete investment package
 * Based on data-model.md specification
 */

import { z } from 'zod';

/**
 * Project status enum
 */
export type ProjectStatus = 'draft' | 'in_progress' | 'finalized';

/**
 * Project interface
 */
export interface Project {
  // Identity
  id: string; // UUID v4
  name: string;
  created: Date; // ISO 8601
  modified: Date; // ISO 8601
  version: string; // Data schema version (e.g., "1.0.0")

  // References (IDs only at this level)
  landParcelId: string | null;
  selectedScenarioId: string | null;

  // Metadata
  status: ProjectStatus;
  notes?: string;
  targetDirectory?: string; // Directory path for AI tool integration (export/import)
}

/**
 * Input for creating a new project
 */
export interface CreateProjectInput {
  name: string;
  notes?: string;
}

/**
 * Input for updating an existing project
 */
export interface UpdateProjectInput {
  name?: string;
  status?: ProjectStatus;
  selectedScenarioId?: string | null;
  notes?: string;
}

/**
 * Zod validation schema for Project
 */
export const ProjectSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
  name: z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters'),
  created: z.date(),
  modified: z.date(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must follow semantic versioning (e.g., 1.0.0)'),
  landParcelId: z.string().uuid().nullable(),
  selectedScenarioId: z.string().uuid().nullable(),
  status: z.enum(['draft', 'in_progress', 'finalized']),
  notes: z.string().optional()
}).refine(
  (data) => data.created <= data.modified,
  { message: 'Created date must be before or equal to modified date' }
);

/**
 * Zod validation schema for CreateProjectInput
 */
export const CreateProjectInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters'),
  notes: z.string().optional()
});

/**
 * Zod validation schema for UpdateProjectInput
 */
export const UpdateProjectInputSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(['draft', 'in_progress', 'finalized']).optional(),
  selectedScenarioId: z.string().uuid().nullable().optional(),
  notes: z.string().optional()
});

/**
 * Validate Project object
 */
export function validateProject(project: unknown): Project {
  return ProjectSchema.parse(project);
}

/**
 * Validate CreateProjectInput object
 */
export function validateCreateProjectInput(input: unknown): CreateProjectInput {
  return CreateProjectInputSchema.parse(input);
}

/**
 * Validate UpdateProjectInput object
 */
export function validateUpdateProjectInput(input: unknown): UpdateProjectInput {
  return UpdateProjectInputSchema.parse(input);
}

/**
 * Create a new Project with default values
 */
export function createProject(input: CreateProjectInput, id?: string): Project {
  const validatedInput = validateCreateProjectInput(input);
  const now = new Date();

  return {
    id: id || crypto.randomUUID(),
    name: validatedInput.name,
    created: now,
    modified: now,
    version: '1.0.0',
    landParcelId: null,
    selectedScenarioId: null,
    status: 'draft',
    notes: validatedInput.notes
  };
}

/**
 * Convert Date to ISO 8601 string for database storage
 */
export function dateToISO(date: Date): string {
  return date.toISOString();
}

/**
 * Convert ISO 8601 string to Date
 */
export function isoToDate(iso: string): Date {
  return new Date(iso);
}
