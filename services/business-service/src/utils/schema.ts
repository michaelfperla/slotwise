import { z } from 'zod';

// Type definitions for JSON Schema
interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  enum?: unknown[];
  format?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  default?: unknown;
}

/**
 * Convert Zod schema to JSON Schema for Fastify validation
 * This is a simplified converter for the schemas we're using
 */
export function zodToJsonSchema(zodSchema: z.ZodSchema): JsonSchema {
  // This is a basic implementation for the schemas we're using
  // For production, consider using a library like zod-to-json-schema

  if (zodSchema instanceof z.ZodObject) {
    const shape = zodSchema.shape;
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = convertZodType(value as z.ZodTypeAny);

      // Check if field is required (not optional)
      if (!(value as z.ZodTypeAny).isOptional()) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
      additionalProperties: false,
    };
  }

  return convertZodType(zodSchema);
}

function convertZodType(zodType: z.ZodTypeAny): JsonSchema {
  if (zodType instanceof z.ZodString) {
    const schema: JsonSchema = { type: 'string' };

    // Handle string constraints
    if (zodType._def.checks) {
      for (const check of zodType._def.checks) {
        switch (check.kind) {
          case 'min':
            schema.minLength = check.value;
            break;
          case 'max':
            schema.maxLength = check.value;
            break;
          case 'email':
            schema.format = 'email';
            break;
          case 'url':
            schema.format = 'uri';
            break;
          case 'regex':
            schema.pattern = check.regex.source;
            break;
          case 'length':
            schema.minLength = check.value;
            schema.maxLength = check.value;
            break;
        }
      }
    }

    return schema;
  }

  if (zodType instanceof z.ZodNumber) {
    const schema: JsonSchema = { type: 'number' };

    // Handle number constraints
    if (zodType._def.checks) {
      for (const check of zodType._def.checks) {
        switch (check.kind) {
          case 'min':
            schema.minimum = check.value;
            break;
          case 'max':
            schema.maximum = check.value;
            break;
          case 'int':
            schema.type = 'integer';
            break;
        }
      }
    }

    return schema;
  }

  if (zodType instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }

  if (zodType instanceof z.ZodArray) {
    return {
      type: 'array',
      items: convertZodType(zodType._def.type),
    };
  }

  if (zodType instanceof z.ZodOptional) {
    return convertZodType(zodType._def.innerType);
  }

  if (zodType instanceof z.ZodDefault) {
    const schema = convertZodType(zodType._def.innerType);
    schema.default = zodType._def.defaultValue();
    return schema;
  }

  if (zodType instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: zodType._def.values,
    };
  }

  if (zodType instanceof z.ZodNativeEnum) {
    return {
      type: 'string',
      enum: Object.values((zodType._def as unknown as { enumType: Record<string, unknown> }).enumType),
    };
  }

  // Fallback for unknown types
  return { type: 'string' };
}

/**
 * Create a validation middleware that uses Zod for actual validation
 * while providing JSON Schema for Fastify documentation
 */
export function createValidationSchema(zodSchema: z.ZodSchema) {
  return {
    jsonSchema: zodToJsonSchema(zodSchema),
    zodSchema,
  };
}
