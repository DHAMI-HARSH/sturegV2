import { z } from "zod";

export const studentLoginSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  ddNumber: z.string().trim().min(3).max(50),
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const semesterConfigSchema = z
  .object({
    label: z.string().trim().min(3).max(100),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  })
  .refine((value) => new Date(value.startDate) <= new Date(value.endDate), {
    message: "Start date must be before or equal to end date",
    path: ["endDate"],
  });

export const studentAccountSchema = z.object({
  ddNumber: z.string().trim().min(3).max(50),
  email: z.string().email(),
  temporaryPassword: z.string().min(8).max(100),
});

export const resetPasswordSchema = z.object({
  temporaryPassword: z.string().min(8).max(100),
});

export const rejectStudentSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8).max(100),
    newPassword: z.string().min(8).max(100),
    confirmPassword: z.string().min(8).max(100),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const studentFormSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  dob: z.string().datetime(),
  gender: z.string().trim().min(1).max(20),
  address: z.string().trim().min(10).max(500),
  phone: z.string().trim().min(8).max(20),
  email: z.string().email(),
  course: z.string().trim().min(2).max(100),
  branch: z.string().trim().min(2).max(100),
  semester: z.coerce.number().int().min(1).max(12),
  yearOfAdmission: z.coerce.number().int().min(2000).max(2100),
  cgpa: z.coerce.number().min(0).max(10),
  parentName: z.string().trim().min(3).max(120),
  parentRelation: z.string().trim().min(2).max(40),
  parentPhone: z.string().trim().min(8).max(20),
  emergencyContact: z.string().trim().min(3).max(120),
  emergencyPhone: z.string().trim().min(8).max(20),
});
