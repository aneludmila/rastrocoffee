import {cookies} from "next/headers";
import {NextResponse} from "next/server";
import {authRequest} from "@/lib/supabase";
import {ACCESS_COOKIE,clearSession} from "@/lib/session";
export async function POST(req:Request) {
  const token=(await cookies()).get(ACCESS_COOKIE)?.value;
  if(token)try{await authRequest("logout?scope=local",{method:"POST",headers:{Authorization:`Bearer ${token}`}});}catch{}
  const response=NextResponse.redirect(new URL("/login",req.url),303);
  clearSession(response);return response;
}
