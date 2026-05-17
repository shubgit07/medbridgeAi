import { redirect } from "next/navigation";

// (auth) group root — redirect to signin
export default function AuthRoot() {
  redirect("/signin");
}