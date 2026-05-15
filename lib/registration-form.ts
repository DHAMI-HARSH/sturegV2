import { z } from "zod";
import { AppError } from "@/lib/errors";

export const REGISTRATION_FIELD_TYPES = [
  "text",
  "email",
  "number",
  "date",
  "textarea",
] as const;

export type RegistrationFieldType = (typeof REGISTRATION_FIELD_TYPES)[number];

export type RegistrationFieldConfig = {
  id: string;
  key: string;
  label: string;
  type: RegistrationFieldType;
  placeholder: string;
  required: boolean;
  enabled: boolean;
  system: boolean;
};

export type RegistrationFormData = Record<string, string>;

type SystemFieldDefinition = {
  key: string;
  label: string;
  type: RegistrationFieldType;
  placeholder: string;
  required: boolean;
};

const SYSTEM_FIELD_DEFINITIONS: SystemFieldDefinition[] = [
  { key: "fullName", label: "Full Name", type: "text", placeholder: "Full Name", required: true },
  { key: "dob", label: "Date of Birth", type: "date", placeholder: "", required: true },
  { key: "gender", label: "Gender", type: "text", placeholder: "Gender", required: true },
  { key: "address", label: "Address", type: "textarea", placeholder: "Address", required: true },
  { key: "phone", label: "Phone", type: "text", placeholder: "Phone", required: true },
  { key: "email", label: "Personal Email", type: "email", placeholder: "Personal Email", required: true },
  { key: "course", label: "Course", type: "text", placeholder: "Course", required: true },
  { key: "branch", label: "Branch", type: "text", placeholder: "Branch", required: true },
  { key: "semester", label: "Semester", type: "number", placeholder: "Semester", required: true },
  { key: "yearOfAdmission", label: "Year of Admission", type: "number", placeholder: "Year of Admission", required: true },
  { key: "cgpa", label: "CGPA", type: "number", placeholder: "CGPA", required: true },
  { key: "parentName", label: "Parent Name", type: "text", placeholder: "Parent Name", required: true },
  { key: "parentRelation", label: "Parent Relation", type: "text", placeholder: "Parent Relation", required: true },
  { key: "parentPhone", label: "Parent Phone", type: "text", placeholder: "Parent Phone", required: true },
  { key: "emergencyContact", label: "Emergency Contact", type: "text", placeholder: "Emergency Contact", required: true },
  { key: "emergencyPhone", label: "Emergency Phone", type: "text", placeholder: "Emergency Phone", required: true },
];

export const SYSTEM_FIELD_KEYS = new Set(
  SYSTEM_FIELD_DEFINITIONS.map((definition) => definition.key),
);

export const DEFAULT_REGISTRATION_FIELDS: RegistrationFieldConfig[] =
  SYSTEM_FIELD_DEFINITIONS.map((definition) => ({
    id: definition.key,
    key: definition.key,
    label: definition.label,
    type: definition.type,
    placeholder: definition.placeholder,
    required: definition.required,
    enabled: true,
    system: true,
  }));

const fieldConfigSchema = z.object({
  id: z.string().trim().min(1).max(80),
  key: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  type: z.enum(REGISTRATION_FIELD_TYPES),
  placeholder: z.string().trim().max(160),
  required: z.boolean(),
  enabled: z.boolean().default(true),
  system: z.boolean().default(false),
});

export const registrationFormConfigSchema = z
  .object({
    fields: z.array(fieldConfigSchema).min(1).max(50),
  })
  .transform(({ fields }) => normalizeRegistrationFieldConfigs(fields));

function sanitizeKey(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^[0-9]/, "field_$&");
}

function buildFieldValidator(field: RegistrationFieldConfig) {
  let validator: z.ZodType<string> = field.required
    ? z.string().trim().min(1, `${field.label} is required.`)
    : z
        .string()
        .trim()
        .optional()
        .transform((value) => value ?? "");

  switch (field.type) {
    case "email":
      validator = validator.refine(
        (value) => value.length === 0 || z.string().email().safeParse(value).success,
        `${field.label} must be a valid email address.`,
      );
      break;
    case "number":
      validator = validator.refine(
        (value) => value.length === 0 || Number.isFinite(Number(value)),
        `${field.label} must be a valid number.`,
      );
      break;
    case "date":
      validator = validator.refine(
        (value) => value.length === 0 || !Number.isNaN(Date.parse(value)),
        `${field.label} must be a valid date.`,
      );
      break;
    default:
      break;
  }

  return validator;
}

function normalizeSingleField(
  field: z.infer<typeof fieldConfigSchema>,
  index: number,
): RegistrationFieldConfig {
  const systemDefinition = SYSTEM_FIELD_DEFINITIONS.find(
    (definition) => definition.key === field.key || definition.key === field.id,
  );

  if (systemDefinition) {
    return {
      id: systemDefinition.key,
      key: systemDefinition.key,
      label: field.label,
      type: systemDefinition.type,
      placeholder: field.placeholder,
      required: systemDefinition.required,
      enabled: field.enabled,
      system: true,
    };
  }

  const sanitizedKey = sanitizeKey(field.key || field.label || `custom_${index + 1}`);

  if (!sanitizedKey) {
    throw new AppError("Custom field keys cannot be empty.", 400);
  }

  return {
    id: field.id || sanitizedKey,
    key: sanitizedKey.startsWith("custom_") ? sanitizedKey : `custom_${sanitizedKey}`,
    label: field.label,
    type: field.type,
    placeholder: field.placeholder,
    required: field.required,
    enabled: field.enabled,
    system: false,
  };
}

export function normalizeRegistrationFieldConfigs(input: unknown): RegistrationFieldConfig[] {
  const rawFields = z.array(fieldConfigSchema).parse(input);
  const normalized = rawFields.map(normalizeSingleField);
  const fieldByKey = new Map<string, RegistrationFieldConfig>();

  for (const field of normalized) {
    if (fieldByKey.has(field.key)) {
      throw new AppError(`Duplicate registration field key "${field.key}".`, 400);
    }

    fieldByKey.set(field.key, field);
  }

  const mergedSystemFields = DEFAULT_REGISTRATION_FIELDS.map(
    (defaultField) => fieldByKey.get(defaultField.key) ?? defaultField,
  );
  const customFields = normalized.filter((field) => !field.system);

  return [...mergedSystemFields, ...customFields];
}

export function buildRegistrationSubmissionSchema(fields: RegistrationFieldConfig[]) {
  const shape = Object.fromEntries(
    fields.map((field) => [
      field.key,
      field.enabled
        ? buildFieldValidator(field)
        : z
            .string()
            .optional()
            .transform((value) => value ?? ""),
    ]),
  );

  return z.object(shape).passthrough();
}

export function buildFormDataFromStoredValues(values: Record<string, unknown> | null | undefined) {
  const data: RegistrationFormData = {};

  if (!values) {
    return data;
  }

  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined) {
      data[key] = "";
      continue;
    }

    if (typeof value === "string") {
      data[key] = value;
      continue;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      data[key] = String(value);
      continue;
    }

    if (value instanceof Date) {
      data[key] = value.toISOString();
      continue;
    }

    data[key] = String(value);
  }

  return data;
}

export function toDateInputValue(value: string | Date | null | undefined) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function extractSystemFormValues(formData: RegistrationFormData) {
  const now = new Date();
  const currentYear = now.getUTCFullYear();

  return {
    fullName: formData.fullName || "Not Provided",
    dob: new Date(formData.dob || now.toISOString()),
    gender: formData.gender || "Not Provided",
    address: formData.address || "Not Provided",
    phone: formData.phone || "Not Provided",
    email: formData.email || "hidden-field@example.invalid",
    course: formData.course || "Not Provided",
    branch: formData.branch || "Not Provided",
    semester: Number(formData.semester || "1"),
    yearOfAdmission: Number(formData.yearOfAdmission || String(currentYear)),
    cgpa: Number(formData.cgpa || "0"),
    parentName: formData.parentName || "Not Provided",
    parentRelation: formData.parentRelation || "Not Provided",
    parentPhone: formData.parentPhone || "Not Provided",
    emergencyContact: formData.emergencyContact || "Not Provided",
    emergencyPhone: formData.emergencyPhone || "Not Provided",
  };
}
