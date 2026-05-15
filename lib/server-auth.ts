import { type StudentStatus } from "@/lib/db-types";
import { AppError } from "@/lib/errors";
import { getAdminById, getStudentByDdNumber, getStudentById } from "@/lib/db";
import { getAdminSession, getStudentSession } from "@/lib/session";

export async function requireAdmin() {
  const session = await getAdminSession();

  if (!session) {
    throw new AppError("Unauthorized", 401);
  }

  const admin = await getAdminById(session.adminId);

  if (!admin) {
    throw new AppError("Admin account not found.", 401);
  }

  return {
    user: {
      id: admin.id,
      email: admin.email,
      role: "admin" as const,
    },
  };
}

export async function requireStudent() {
  const session = await getStudentSession();

  if (!session) {
    throw new AppError("Unauthorized", 401);
  }

  const student = session.studentId
    ? await getStudentById(session.studentId)
    : await getStudentByDdNumber(session.ddNumber);

  if (!student) {
    throw new AppError("Student account not found.", 401);
  }

  if (student.ddNumber !== session.ddNumber) {
    throw new AppError("Student session does not match the current account.", 401);
  }

  return {
    user: {
      id: student.id,
      role: "student" as const,
      ddNumber: student.ddNumber,
      studentStatus: student.status,
      forcePasswordChange: student.forcePasswordChange,
    },
  };
}

export async function requireApprovedStudent() {
  const session = await requireStudent();

  if (session.user.studentStatus !== ("APPROVED" as StudentStatus)) {
    throw new AppError("Student account is not approved yet.", 403);
  }

  return session;
}
