/**
 * ProjectValidator Service
 * JSON validation and recovery logic for project import
 * Per FR-087, FR-090, FR-091, FR-092, FR-093
 */

import { z } from 'zod';
import { ProjectSchema } from '../models/Project';
import { LandParcelSchema } from '../models/LandParcel';
import { SubdivisionScenarioSchema } from '../models/SubdivisionScenario';
import { SocialClubDesignSchema } from '../models/SocialClubDesign';
import { FinancialAnalysisSchema } from '../models/FinancialAnalysis';
import { ImportResult, ImportError, ImportWarning } from '../models/Import';
import * as crypto from 'crypto';

/**
 * Project export JSON structure
 */
export interface ProjectExportData {
  schemaVersion: string;
  exportDate: string;
  project: any;
  metadata: {
    exportedBy: string;
    checksum: string;
  };
}

/**
 * Project export schema
 */
const ProjectExportSchema = z.object({
  schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  exportDate: z.string(),
  project: z.any(),
  metadata: z.object({
    exportedBy: z.string(),
    checksum: z.string(),
  }),
});

/**
 * Validation result for a single field
 */
interface FieldValidationResult {
  field: string;
  valid: boolean;
  error?: string;
  expectedType?: string;
  receivedValue?: any;
}

/**
 * ProjectValidator class
 * Validates imported project data and provides recovery options
 */
export class ProjectValidator {
  /**
   * Validate complete project export structure
   */
  static validateExportStructure(data: unknown): {
    valid: boolean;
    errors: ImportError[];
    data?: ProjectExportData;
  } {
    const errors: ImportError[] = [];

    try {
      const exportData = ProjectExportSchema.parse(data);
      return {
        valid: true,
        errors: [],
        data: exportData,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          errors.push({
            field: err.path.join('.'),
            message: err.message,
            expectedType: 'string',
            receivedValue: undefined,
            severity: 'critical',
          });
        });
      } else {
        errors.push({
          field: 'root',
          message: 'Invalid JSON structure',
          severity: 'critical',
        });
      }

      return {
        valid: false,
        errors,
      };
    }
  }

  /**
   * Validate checksum for data integrity
   * Per data-model.md export format
   */
  static validateChecksum(data: ProjectExportData): boolean {
    const { metadata, ...dataWithoutMetadata } = data;
    const calculatedChecksum = this.calculateChecksum(dataWithoutMetadata);
    return calculatedChecksum === metadata.checksum;
  }

  /**
   * Calculate SHA-256 checksum for data
   */
  static calculateChecksum(data: any): string {
    const jsonString = JSON.stringify(data, null, 0);
    return crypto.createHash('sha256').update(jsonString).digest('hex');
  }

  /**
   * Validate project data against schema
   * Returns field-by-field validation results
   */
  static validateProjectData(projectData: any): {
    valid: boolean;
    errors: ImportError[];
    warnings: ImportWarning[];
    validatedFields: Record<string, any>;
    invalidFields: string[];
  } {
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];
    const validatedFields: Record<string, any> = {};
    const invalidFields: string[] = [];

    // Validate top-level project structure
    const projectValidation = this.validateField('project', projectData, ProjectSchema);
    if (!projectValidation.valid) {
      errors.push({
        field: projectValidation.field,
        message: projectValidation.error || 'Invalid project structure',
        expectedType: projectValidation.expectedType,
        receivedValue: projectValidation.receivedValue,
        severity: 'critical',
      });
      invalidFields.push(projectValidation.field);
    } else {
      validatedFields.project = projectData;
    }

    // Validate land parcel if present
    if (projectData.landParcel) {
      const landValidation = this.validateField(
        'landParcel',
        projectData.landParcel,
        LandParcelSchema
      );
      if (!landValidation.valid) {
        errors.push({
          field: landValidation.field,
          message: landValidation.error || 'Invalid land parcel structure',
          expectedType: landValidation.expectedType,
          receivedValue: landValidation.receivedValue,
          severity: 'recoverable',
        });
        invalidFields.push(landValidation.field);
      } else {
        validatedFields.landParcel = projectData.landParcel;
      }
    }

    // Validate subdivision scenarios if present
    if (projectData.subdivisionScenarios && Array.isArray(projectData.subdivisionScenarios)) {
      const scenariosValidation = this.validateArray(
        'subdivisionScenarios',
        projectData.subdivisionScenarios,
        SubdivisionScenarioSchema
      );

      scenariosValidation.errors.forEach((err) => {
        errors.push({
          field: err.field,
          message: err.error || 'Invalid scenario',
          expectedType: err.expectedType,
          receivedValue: err.receivedValue,
          severity: 'recoverable',
        });
        invalidFields.push(err.field);
      });

      validatedFields.subdivisionScenarios = scenariosValidation.validItems;

      if (scenariosValidation.invalidCount > 0) {
        warnings.push({
          field: 'subdivisionScenarios',
          message: `${scenariosValidation.invalidCount} invalid scenarios skipped`,
          suggestion: 'Review and recalculate subdivision scenarios',
        });
      }
    }

    // Validate social club design if present
    if (projectData.socialClubDesign) {
      const socialClubValidation = this.validateField(
        'socialClubDesign',
        projectData.socialClubDesign,
        SocialClubDesignSchema
      );

      if (!socialClubValidation.valid) {
        errors.push({
          field: socialClubValidation.field,
          message: socialClubValidation.error || 'Invalid social club design',
          expectedType: socialClubValidation.expectedType,
          receivedValue: socialClubValidation.receivedValue,
          severity: 'recoverable',
        });
        invalidFields.push(socialClubValidation.field);
      } else {
        validatedFields.socialClubDesign = projectData.socialClubDesign;
      }
    }

    // Validate financial analysis if present
    if (projectData.financialAnalysis) {
      const financialValidation = this.validateField(
        'financialAnalysis',
        projectData.financialAnalysis,
        FinancialAnalysisSchema
      );

      if (!financialValidation.valid) {
        errors.push({
          field: financialValidation.field,
          message: financialValidation.error || 'Invalid financial analysis',
          expectedType: financialValidation.expectedType,
          receivedValue: financialValidation.receivedValue,
          severity: 'recoverable',
        });
        invalidFields.push(financialValidation.field);
      } else {
        validatedFields.financialAnalysis = projectData.financialAnalysis;
      }
    }

    // Determine overall validity
    const hasCriticalErrors = errors.some((e) => e.severity === 'critical');

    return {
      valid: !hasCriticalErrors && errors.length === 0,
      errors,
      warnings,
      validatedFields,
      invalidFields,
    };
  }

  /**
   * Validate a single field against a Zod schema
   */
  private static validateField(
    fieldName: string,
    data: any,
    schema: z.ZodSchema
  ): FieldValidationResult {
    try {
      schema.parse(data);
      return {
        field: fieldName,
        valid: true,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return {
          field: `${fieldName}.${firstError.path.join('.')}`,
          valid: false,
          error: firstError.message,
          expectedType: firstError.expected?.toString(),
          receivedValue: firstError.received,
        };
      }

      return {
        field: fieldName,
        valid: false,
        error: 'Validation failed',
      };
    }
  }

  /**
   * Validate an array of items against a schema
   */
  private static validateArray(
    fieldName: string,
    items: any[],
    schema: z.ZodSchema
  ): {
    validItems: any[];
    invalidCount: number;
    errors: FieldValidationResult[];
  } {
    const validItems: any[] = [];
    const errors: FieldValidationResult[] = [];
    let invalidCount = 0;

    items.forEach((item, index) => {
      const result = this.validateField(`${fieldName}[${index}]`, item, schema);
      if (result.valid) {
        validItems.push(item);
      } else {
        invalidCount++;
        errors.push(result);
      }
    });

    return {
      validItems,
      invalidCount,
      errors,
    };
  }

  /**
   * Perform partial recovery on corrupted project data
   * Loads valid fields and skips invalid ones
   * Per FR-092, FR-093
   */
  static partialRecover(
    projectData: any,
    enablePartialRecovery: boolean
  ): {
    recoveredData: any;
    skippedFields: string[];
    errors: ImportError[];
    warnings: ImportWarning[];
  } {
    if (!enablePartialRecovery) {
      return {
        recoveredData: null,
        skippedFields: [],
        errors: [],
        warnings: [],
      };
    }

    const validation = this.validateProjectData(projectData);
    const recoveredData = { ...validation.validatedFields };
    const skippedFields = validation.invalidFields;

    return {
      recoveredData,
      skippedFields,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  /**
   * Validate imported images directory
   * Per FR-088
   */
  static validateImagesDirectory(
    imagesDir: string,
    expectedImages: string[]
  ): {
    valid: boolean;
    missingImages: string[];
    warnings: ImportWarning[];
  } {
    // This will be implemented with actual file system checks in the main process
    // For now, return structure for type compatibility
    return {
      valid: true,
      missingImages: [],
      warnings: [],
    };
  }

  /**
   * Generate import result summary
   */
  static generateImportResult(
    success: boolean,
    message: string,
    validation: any,
    duration: number,
    projectId?: string
  ): ImportResult {
    return {
      success,
      message,
      importedProjectId: projectId,
      importedAt: new Date(),
      validation: {
        structureValid: validation.structureValid !== false,
        checksumValid: validation.checksumValid !== false,
        schemaValid: validation.schemaValid !== false,
        imagesValid: validation.imagesValid !== false,
      },
      errors: validation.errors || [],
      warnings: validation.warnings || [],
      partialRecovery: validation.partialRecovery,
      missingImages: validation.missingImages || [],
      missingAIPrompts: validation.missingAIPrompts || [],
      duration,
    };
  }
}
