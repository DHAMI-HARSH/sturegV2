import { RegistrationForm } from "@/components/student/registration-form";
import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/session";
import { getStudentPortalPath } from "@/lib/student-portal";

export default async function StudentFormPage() {
  const session = await getStudentSession();

  if (!session) {
    redirect("/student/login");
  }

  const destination = await getStudentPortalPath(session.ddNumber);

  if (destination !== "/student/form") {
    redirect(destination);
  }

  return (
    <main className="min-h-screen px-4 py-14">
      <div className="mx-auto max-w-5xl">
        <RegistrationForm />
      </div>
    </main>
  );
}
