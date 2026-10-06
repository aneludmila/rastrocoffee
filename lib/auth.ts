import "server-only";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {cache} from "react";
import {authRequest} from "./supabase";
import {ACCESS_COOKIE} from "./session";
import {safeReturnPath} from "./auth-policy";
export type AppUser={userId:string;email:string;fullName:string|null;adminOwner:string|null};
export const getUser=cache(async ():Promise<AppUser|null>=>{
  const token=(await cookies()).get(ACCESS_COOKIE)?.value;
  if(!token)return null;
  const response=await authRequest("user",{headers:{Authorization:`Bearer ${token}`}});
  if(!response.ok)return null;
  const user=await response.json();
  if(!user.id||!user.email||!user.email_confirmed_at)return null;
  // App metadata is managed by the Auth administrator, unlike editable user metadata.
  const owner=user.app_metadata?.rastrocoffee_admin_owner;
  const adminOwner=typeof owner==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner)?owner:null;
  return {userId:user.id,email:user.email,fullName:user.user_metadata?.full_name || null,adminOwner};
});
export async function requireUser(returnTo:string) {
  const user=await getUser();if(user)return user;
  redirect("/login?return_to="+encodeURIComponent(safeReturnPath(returnTo)));
}
export function adminEmail() {
  const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if(!email)throw new Error("Configure ADMIN_EMAIL no servidor.");
  return email;
}
