import { getStudentWithFormByDdNumber } from "@/lib/db";

export async function getStudentPortalPath(ddNumber: string) {
  const student = await getStudentWithFormByDdNumber(ddNumber);

  if (!student) {
    return "/student/login";
  }

  if (student.status === "APPROVED") {
    return "/student/form";
  }

  return "/student/status";
}
