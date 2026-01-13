import { z } from 'zod';

/**
 * Result of project import operation with validation details
 */
export interface ImportResult {
  success: boolean;
  message: string;

  // Import statistics
  importedProjectId?: string;
  importedAt: Date;

  // Validation details
  validation: {
    structureValid: boolean;
    checksumValid: boolean;
    schemaValid: boolean;
    imagesValid: boolean;
  };

  // Error details (if any)
  errors: ImportError[];
  warnings: ImportWarning[];

  // Partial recovery details
  partialRecovery?: {
    enabled: boolean;
    skippedFields: string[];
    recoveredData: any;
  };

  // Missing resources
  missingImages: string[];
  missingAIPrompts: string[];

  // Performance metrics
  duration: number; // milliseconds
}

/**
 * Import error with field-level details
 */
export interface ImportError {
  field: string;
  message: string;
  expectedType?: string;
  receivedValue?: any;
  severity: 'critical' | 'recoverable';
}

/**
 * Import warning for non-critical issues
 */
export interface ImportWarning {
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * Validation schema for import result
 */
export const ImportResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  importedProjectId: z.string().uuid().optional(),
  importedAt: z.date(),
  validation: z.object({
    structureValid: z.boolean(),
    checksumValid: z.boolean(),
    schemaValid: z.boolean(),
    imagesValid: z.boolean(),
  }),
  errors: z.array(
    z.object({
      field: z.string(),
      message: z.string(),
      expectedType: z.string().optional(),
      receivedValue: z.any().optional(),
      severity: z.enum(['critical', 'recoverable']),
    })
  ),
  warnings: z.array(
    z.object({
      field: z.string(),
      message: z.string(),
      suggestion: z.string().optional(),
    })
  ),
  partialRecovery: z
    .object({
      enabled: z.boolean(),
      skippedFields: z.array(z.string()),
      recoveredData: z.any(),
    })
    .optional(),
  missingImages: z.array(z.string()),
  missingAIPrompts: z.array(z.string()),
  duration: z.number(),
});

/**
 * Options for import operation
 */
export interface ImportOptions {
  enablePartialRecovery: boolean;
  validateChecksum: boolean;
  importImages: boolean;
  overwriteExisting: boolean;
}

/**
 * Default import options
 */
export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  enablePartialRecovery: true,
  validateChecksum: true,
  importImages: true,
  overwriteExisting: false,
};
