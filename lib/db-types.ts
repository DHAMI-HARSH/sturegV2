export const STUDENT_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const RECEIPT_VALIDATION_STATUSES = ["VALID", "INVALID", "UNREADABLE"] as const;
export type ReceiptValidationStatus = (typeof RECEIPT_VALIDATION_STATUSES)[number];

export type SessionRole = "admin" | "student";

export type Admin = {
  id: string;
  email: string;
  password: string;
  createdAt: Date;
};

export type Student = {
  id: string;
  ddNumber: string;
  studentName: string | null;
  password: string;
  email: string | null;
  status: StudentStatus;
  rejectionNote: string | null;
  receiptUrl: string | null;
  receiptDate: Date | null;
  approvedAt: Date | null;
  createdAt: Date;
  forcePasswordChange: boolean;
  lastLoginRequestedAt: Date | null;
  receiptValidationStatus: ReceiptValidationStatus | null;
  receiptValidationMessage: string | null;
  receiptOcrDebugText: string | null;
};

export type StudentForm = {
  id: string;
  studentId: string;
  fullName: string;
  dob: Date;
  gender: string;
  address: string;
  phone: string;
  email: string;
  course: string;
  branch: string;
  semester: number;
  yearOfAdmission: number;
  cgpa: number;
  parentName: string;
  parentRelation: string;
  parentPhone: string;
  emergencyContact: string;
  emergencyPhone: string;
  formData: Record<string, string>;
  submittedAt: Date;
};

export type StudentWithForm = Student & {
  form: StudentForm | null;
};

export type StudentWithRequiredForm = Student & {
  form: StudentForm;
};

export type SemesterConfig = {
  id: string;
  label: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
};

export type AuditLog = {
  id: string;
  adminId: string;
  action: string;
  targetId: string;
  note: string | null;
  createdAt: Date;
};

export type RegistrationFieldType = "text" | "email" | "number" | "date" | "textarea";

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
