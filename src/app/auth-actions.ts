"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import {
  clearFailedLogins,
  endSession,
  loginBlocked,
  noteFailedLogin,
  passwordMatches,
  startSession,
} from "@/lib/auth";

export async function login(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");

  if (!process.env.AUTH_PASSWORD) {
    return { ok: false, error: "Login is not configured on the server." };
  }
  if (await loginBlocked()) {
    return { ok: false, error: "Too many attempts. Please try again in 10 minutes." };
  }
  if (!passwordMatches(password)) {
    await noteFailedLogin();
    return { ok: false, error: "Incorrect password." };
  }

  clearFailedLogins();
  await startSession();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout() {
  await endSession();
  redirect("/login");
}
