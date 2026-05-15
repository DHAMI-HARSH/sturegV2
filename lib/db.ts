import { AppError } from "@/lib/errors";
import type {
  Admin,
  AuditLog,
  RegistrationFieldConfig,
  ReceiptValidationStatus,
  SemesterConfig,
  Student,
  StudentForm,
  StudentStatus,
  StudentWithForm,
  StudentWithRequiredForm,
} from "@/lib/db-types";
import {
  buildFormDataFromStoredValues,
  DEFAULT_REGISTRATION_FIELDS,
  normalizeRegistrationFieldConfigs,
} from "@/lib/registration-form";
import { supabaseRequest } from "@/lib/supabase-rest";

type AdminRow = {
  id: string;
  email: string;
  password: string;
  created_at: string;
};

type StudentRow = {
  id: string;
  dd_number: string;
  student_name: string | null;
  password: string;
  email: string | null;
  status: StudentStatus;
  rejection_note: string | null;
  receipt_url: string | null;
  receipt_date: string | null;
  approved_at: string | null;
  created_at: string;
  force_password_change: boolean;
  last_login_requested_at: string | null;
  receipt_validation_status: ReceiptValidationStatus | null;
  receipt_validation_message: string | null;
  receipt_ocr_debug_text?: string | null;
};

type StudentFormRow = {
  id: string;
  student_id: string;
  full_name: string;
  dob: string;
  gender: string;
  address: string;
  phone: string;
  email: string;
  course: string;
  branch: string;
  semester: number;
  year_of_admission: number;
  cgpa: number;
  parent_name: string;
  parent_relation: string;
  parent_phone: string;
  emergency_contact: string;
  emergency_phone: string;
  form_data?: Record<string, unknown> | null;
  submitted_at: string;
};

type RegistrationFormConfigRow = {
  id: string;
  fields: unknown;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type SemesterConfigRow = {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
};

type AuditLogRow = {
  id: string;
  admin_id: string;
  action: string;
  target_id: string;
  note: string | null;
  created_at: string;
};

function asDate(value: string | null) {
  return value ? new Date(value) : null;
}

function mapAdmin(row: AdminRow): Admin {
  return {
    id: row.id,
    email: row.email,
    password: row.password,
    createdAt: new Date(row.created_at),
  };
}

function mapStudent(row: StudentRow): Student {
  return {
    id: row.id,
    ddNumber: row.dd_number,
    studentName: row.student_name ?? null,
    password: row.password,
    email: row.email,
    status: row.status,
    rejectionNote: row.rejection_note,
    receiptUrl: row.receipt_url,
    receiptDate: asDate(row.receipt_date),
    approvedAt: asDate(row.approved_at),
    createdAt: new Date(row.created_at),
    forcePasswordChange: row.force_password_change,
    lastLoginRequestedAt: asDate(row.last_login_requested_at),
    receiptValidationStatus: row.receipt_validation_status,
    receiptValidationMessage: row.receipt_validation_message,
    receiptOcrDebugText: row.receipt_ocr_debug_text ?? null,
  };
}

function isMissingStudentNameColumnError(error: unknown) {
  return error instanceof AppError && error.message.includes("'student_name' column");
}

function isMissingReceiptOcrDebugTextColumnError(error: unknown) {
  return error instanceof AppError && error.message.includes("'receipt_ocr_debug_text' column");
}

function isMissingFormDataColumnError(error: unknown) {
  return error instanceof AppError && error.message.includes("'form_data' column");
}

function isMissingRegistrationConfigTableError(error: unknown) {
  return (
    error instanceof AppError &&
    (error.message.includes("registration_form_configs") ||
      error.message.toLowerCase().includes("relation") ||
      error.message.toLowerCase().includes("schema cache"))
  );
}

function stripUnsupportedStudentColumns(payload: Record<string, unknown>, error: unknown) {
  const fallbackPayload = { ...payload };
  let changed = false;

  if (isMissingStudentNameColumnError(error) && "student_name" in fallbackPayload) {
    delete fallbackPayload.student_name;
    changed = true;
  }

  if (isMissingReceiptOcrDebugTextColumnError(error) && "receipt_ocr_debug_text" in fallbackPayload) {
    delete fallbackPayload.receipt_ocr_debug_text;
    changed = true;
  }

  return changed ? fallbackPayload : null;
}

function mapForm(row: StudentFormRow): StudentForm {
  const baseFormData = {
    fullName: row.full_name,
    dob: row.dob,
    gender: row.gender,
    address: row.address,
    phone: row.phone,
    email: row.email,
    course: row.course,
    branch: row.branch,
    semester: String(row.semester),
    yearOfAdmission: String(row.year_of_admission),
    cgpa: String(row.cgpa),
    parentName: row.parent_name,
    parentRelation: row.parent_relation,
    parentPhone: row.parent_phone,
    emergencyContact: row.emergency_contact,
    emergencyPhone: row.emergency_phone,
  };

  return {
    id: row.id,
    studentId: row.student_id,
    fullName: row.full_name,
    dob: new Date(row.dob),
    gender: row.gender,
    address: row.address,
    phone: row.phone,
    email: row.email,
    course: row.course,
    branch: row.branch,
    semester: row.semester,
    yearOfAdmission: row.year_of_admission,
    cgpa: row.cgpa,
    parentName: row.parent_name,
    parentRelation: row.parent_relation,
    parentPhone: row.parent_phone,
    emergencyContact: row.emergency_contact,
    emergencyPhone: row.emergency_phone,
    formData: {
      ...baseFormData,
      ...buildFormDataFromStoredValues(row.form_data),
      dob: baseFormData.dob,
    },
    submittedAt: new Date(row.submitted_at),
  };
}

function mapSemesterConfig(row: SemesterConfigRow): SemesterConfig {
  return {
    id: row.id,
    label: row.label,
    startDate: new Date(row.start_date),
    endDate: new Date(row.end_date),
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
  };
}

function mapAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    adminId: row.admin_id,
    action: row.action,
    targetId: row.target_id,
    note: row.note,
    createdAt: new Date(row.created_at),
  };
}

async function selectMany<T>(path: string, query?: Record<string, string | number | boolean | undefined>) {
  return supabaseRequest<T[]>(path, { query });
}

async function insertOne<T>(path: string, body: object, query?: Record<string, string | number | boolean | undefined>) {
  const rows = await supabaseRequest<T[]>(path, {
    method: "POST",
    query,
    body,
    prefer: ["return=representation"],
  });

  if (!rows[0]) {
    throw new AppError("Database insert did not return a record.", 500);
  }

  return rows[0];
}

async function patchMany<T>(
  path: string,
  body: object,
  query: Record<string, string | number | boolean | undefined>,
  returnRows = true,
) {
  return supabaseRequest<T[] | null>(path, {
    method: "PATCH",
    query,
    body,
    prefer: returnRows ? ["return=representation"] : ["return=minimal"],
  });
}

async function findOne<T>(path: string, query: Record<string, string | number | boolean | undefined>) {
  const rows = await selectMany<T>(path, { ...query, limit: 1 });
  return rows[0] ?? null;
}

export async function getAdminByEmail(email: string) {
  const row = await findOne<AdminRow>("admins", {
    select: "*",
    email: `eq.${email}`,
  });

  return row ? mapAdmin(row) : null;
}

export async function getAdminById(id: string) {
  const row = await findOne<AdminRow>("admins", {
    select: "*",
    id: `eq.${id}`,
  });

  return row ? mapAdmin(row) : null;
}

export async function getStudentByDdNumber(ddNumber: string) {
  const row = await findOne<StudentRow>("students", {
    select: "*",
    dd_number: `eq.${ddNumber}`,
  });

  return row ? mapStudent(row) : null;
}

export async function getStudentById(id: string) {
  const row = await findOne<StudentRow>("students", {
    select: "*",
    id: `eq.${id}`,
  });

  return row ? mapStudent(row) : null;
}

export async function getStudentFormByStudentId(studentId: string) {
  const row = await findOne<StudentFormRow>("student_forms", {
    select: "*",
    student_id: `eq.${studentId}`,
    order: "submitted_at.desc",
  });

  return row ? mapForm(row) : null;
}

export async function getActiveRegistrationFormConfig() {
  try {
    const row = await findOne<RegistrationFormConfigRow>("registration_form_configs", {
      select: "*",
      is_active: "eq.true",
      order: "updated_at.desc",
    });

    return row ? normalizeRegistrationFieldConfigs(row.fields) : DEFAULT_REGISTRATION_FIELDS;
  } catch (error) {
    if (isMissingRegistrationConfigTableError(error)) {
      return DEFAULT_REGISTRATION_FIELDS;
    }

    throw error;
  }
}

export async function getStudentWithFormByDdNumber(ddNumber: string): Promise<StudentWithForm | null> {
  const student = await getStudentByDdNumber(ddNumber);

  if (!student) {
    return null;
  }

  const form = await getStudentFormByStudentId(student.id);
  return { ...student, form };
}

export async function getStudentWithFormById(id: string): Promise<StudentWithForm | null> {
  const student = await getStudentById(id);

  if (!student) {
    return null;
  }

  const form = await getStudentFormByStudentId(student.id);
  return { ...student, form };
}

export async function getActiveSemesterConfig() {
  const row = await findOne<SemesterConfigRow>("semester_configs", {
    select: "*",
    is_active: "eq.true",
    order: "created_at.desc",
  });

  return row ? mapSemesterConfig(row) : null;
}

export async function listReviewRequests() {
  const rows = await selectMany<StudentRow>("students", {
    select: "*",
    receipt_url: "not.is.null",
    status: "eq.PENDING",
    order: "last_login_requested_at.desc.nullslast",
  });

  return rows.map(mapStudent);
}

async function getFormsByStudentIds(studentIds: string[]) {
  if (!studentIds.length) {
    return [];
  }

  const joinedIds = studentIds.join(",");
  const rows = await selectMany<StudentFormRow>("student_forms", {
    select: "*",
    student_id: `in.(${joinedIds})`,
  });

  return rows.map(mapForm);
}

export async function listApprovedStudentsWithForms(filters?: {
  query?: string;
  branch?: string;
  semester?: string | null;
}): Promise<StudentWithRequiredForm[]> {
  const students = (await selectMany<StudentRow>("students", {
    select: "*",
    status: "eq.APPROVED",
    order: "approved_at.desc.nullslast",
  })).map(mapStudent);

  const forms = await getFormsByStudentIds(students.map((student) => student.id));
  const formByStudentId = new Map(forms.map((form) => [form.studentId, form]));

  const studentsWithForms: StudentWithRequiredForm[] = students.flatMap((student) => {
    const form = formByStudentId.get(student.id);
    return form ? [{ ...student, form }] : [];
  });

  return studentsWithForms
    .filter((student) => {
      if (!filters?.query) {
        return true;
      }

      const term = filters.query.toLowerCase();
      const form = student.form;
      return (
        student.ddNumber.toLowerCase().includes(term) ||
        form.fullName.toLowerCase().includes(term)
      );
    })
    .filter((student) => {
      if (!filters?.branch) {
        return true;
      }

      return student.form.branch.toLowerCase().includes(filters.branch.toLowerCase());
    })
    .filter((student) => {
      if (!filters?.semester) {
        return true;
      }

      return student.form.semester === Number(filters.semester);
    });
}

export async function createStudentAccount(input: {
  ddNumber: string;
  studentName?: string | null;
  email?: string | null;
  password?: string;
  forcePasswordChange?: boolean;
}) {
  const payload = {
    dd_number: input.ddNumber,
    student_name: input.studentName ?? null,
    email: input.email ?? null,
    password: input.password ?? "",
    force_password_change: input.forcePasswordChange ?? true,
  };

  let row: StudentRow;

  try {
    row = await insertOne<StudentRow>("students", payload);
  } catch (error) {
    const fallbackPayload = stripUnsupportedStudentColumns(payload, error);

    if (!fallbackPayload) {
      throw error;
    }

    row = await insertOne<StudentRow>("students", fallbackPayload);
  }

  return mapStudent(row);
}

export async function updateStudentById(
  id: string,
  changes: Partial<{
    studentName: string | null;
    email: string | null;
    password: string;
    status: StudentStatus;
    rejectionNote: string | null;
    receiptUrl: string | null;
    receiptDate: Date | null;
    approvedAt: Date | null;
    forcePasswordChange: boolean;
    lastLoginRequestedAt: Date | null;
    receiptValidationStatus: ReceiptValidationStatus | null;
    receiptValidationMessage: string | null;
    receiptOcrDebugText: string | null;
  }>,
) {
  const payload: Record<string, unknown> = {};

  if ("studentName" in changes) payload.student_name = changes.studentName;
  if ("email" in changes) payload.email = changes.email;
  if ("password" in changes) payload.password = changes.password;
  if ("status" in changes) payload.status = changes.status;
  if ("rejectionNote" in changes) payload.rejection_note = changes.rejectionNote;
  if ("receiptUrl" in changes) payload.receipt_url = changes.receiptUrl;
  if ("receiptDate" in changes) payload.receipt_date = changes.receiptDate?.toISOString() ?? null;
  if ("approvedAt" in changes) payload.approved_at = changes.approvedAt?.toISOString() ?? null;
  if ("forcePasswordChange" in changes)
    payload.force_password_change = changes.forcePasswordChange;
  if ("lastLoginRequestedAt" in changes)
    payload.last_login_requested_at = changes.lastLoginRequestedAt?.toISOString() ?? null;
  if ("receiptValidationStatus" in changes)
    payload.receipt_validation_status = changes.receiptValidationStatus;
  if ("receiptValidationMessage" in changes)
    payload.receipt_validation_message = changes.receiptValidationMessage;
  if ("receiptOcrDebugText" in changes)
    payload.receipt_ocr_debug_text = changes.receiptOcrDebugText;

  let rows: StudentRow[] | null;

  try {
    rows = await patchMany<StudentRow>("students", payload, { id: `eq.${id}` });
  } catch (error) {
    const fallbackPayload = stripUnsupportedStudentColumns(payload, error);

    if (!fallbackPayload) {
      throw error;
    }

    rows = await patchMany<StudentRow>("students", fallbackPayload, { id: `eq.${id}` });
  }

  if (!rows?.[0]) {
    throw new AppError("Student not found.", 404);
  }

  return mapStudent(rows[0]);
}

export async function createStudentForm(
  studentId: string,
  input: Omit<StudentForm, "id" | "studentId" | "submittedAt">,
) {
  const payload = {
    student_id: studentId,
    full_name: input.fullName,
    dob: input.dob.toISOString(),
    gender: input.gender,
    address: input.address,
    phone: input.phone,
    email: input.email,
    course: input.course,
    branch: input.branch,
    semester: input.semester,
    year_of_admission: input.yearOfAdmission,
    cgpa: input.cgpa,
    parent_name: input.parentName,
    parent_relation: input.parentRelation,
    parent_phone: input.parentPhone,
    emergency_contact: input.emergencyContact,
    emergency_phone: input.emergencyPhone,
    form_data: input.formData,
  };

  let row: StudentFormRow;

  try {
    row = await insertOne<StudentFormRow>("student_forms", payload);
  } catch (error) {
    if (!isMissingFormDataColumnError(error)) {
      throw error;
    }

    const { form_data: omittedFormData, ...legacyPayload } = payload;
    void omittedFormData;
    row = await insertOne<StudentFormRow>("student_forms", legacyPayload);
  }

  return mapForm(row);
}

export async function upsertStudentForm(
  studentId: string,
  input: Omit<StudentForm, "id" | "studentId" | "submittedAt">,
) {
  const payload = {
    student_id: studentId,
    full_name: input.fullName,
    dob: input.dob.toISOString(),
    gender: input.gender,
    address: input.address,
    phone: input.phone,
    email: input.email,
    course: input.course,
    branch: input.branch,
    semester: input.semester,
    year_of_admission: input.yearOfAdmission,
    cgpa: input.cgpa,
    parent_name: input.parentName,
    parent_relation: input.parentRelation,
    parent_phone: input.parentPhone,
    emergency_contact: input.emergencyContact,
    emergency_phone: input.emergencyPhone,
    form_data: input.formData,
  };

  let rows: StudentFormRow[];

  try {
    rows = await supabaseRequest<StudentFormRow[]>("student_forms", {
      method: "POST",
      query: { on_conflict: "student_id" },
      body: [payload],
      prefer: ["resolution=merge-duplicates", "return=representation"],
    });
  } catch (error) {
    if (!isMissingFormDataColumnError(error)) {
      throw error;
    }

    const { form_data: omittedFormData, ...legacyPayload } = payload;
    void omittedFormData;
    rows = await supabaseRequest<StudentFormRow[]>("student_forms", {
      method: "POST",
      query: { on_conflict: "student_id" },
      body: [legacyPayload],
      prefer: ["resolution=merge-duplicates", "return=representation"],
    });
  }

  if (!rows[0]) {
    throw new AppError("Student form upsert did not return a record.", 500);
  }

  return mapForm(rows[0]);
}

export async function setActiveRegistrationFormConfig(fields: RegistrationFieldConfig[]) {
  const normalizedFields = normalizeRegistrationFieldConfigs(fields);

  try {
    await patchMany<RegistrationFormConfigRow>(
      "registration_form_configs",
      { is_active: false },
      { is_active: "eq.true" },
      false,
    );

    const row = await insertOne<RegistrationFormConfigRow>("registration_form_configs", {
      fields: normalizedFields,
      is_active: true,
    });

    return normalizeRegistrationFieldConfigs(row.fields);
  } catch (error) {
    if (isMissingRegistrationConfigTableError(error)) {
      throw new AppError(
        "Registration form config table is missing. Apply the updated Supabase schema first.",
        500,
      );
    }

    throw error;
  }
}

export async function createAuditLog(input: {
  adminId: string;
  action: string;
  targetId: string;
  note?: string | null;
}) {
  const row = await insertOne<AuditLogRow>("audit_logs", {
    admin_id: input.adminId,
    action: input.action,
    target_id: input.targetId,
    note: input.note ?? null,
  });

  return mapAuditLog(row);
}

export async function setActiveSemesterConfig(input: {
  label: string;
  startDate: Date;
  endDate: Date;
}) {
  await patchMany<SemesterConfigRow>(
    "semester_configs",
    { is_active: false },
    { is_active: "eq.true" },
    false,
  );

  const row = await insertOne<SemesterConfigRow>("semester_configs", {
    label: input.label,
    start_date: input.startDate.toISOString(),
    end_date: input.endDate.toISOString(),
    is_active: true,
  });

  return mapSemesterConfig(row);
}

export async function upsertAdmin(input: { email: string; password: string }) {
  const rows = await supabaseRequest<AdminRow[]>("admins", {
    method: "POST",
    query: { on_conflict: "email" },
    body: [
      {
        email: input.email,
        password: input.password,
      },
    ],
    prefer: ["resolution=merge-duplicates", "return=representation"],
  });

  if (!rows[0]) {
    throw new AppError("Admin seed failed.", 500);
  }

  return mapAdmin(rows[0]);
}

export async function ensureDefaultSemesterWindow() {
  const existing = await getActiveSemesterConfig();

  if (existing) {
    return existing;
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 45);
  end.setHours(23, 59, 59, 999);

  return setActiveSemesterConfig({
    label: "Sample Semester Window",
    startDate: start,
    endDate: end,
  });
}
