import "server-only";
import type { NextResponse } from "next/server";
export const ACCESS_COOKIE="rc-access";
export const REFRESH_COOKIE="rc-refresh";
export function setSession(response:NextResponse,session:any) {
  const options={httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/"};
  response.cookies.set(ACCESS_COOKIE,session.access_token,{...options,maxAge:60*60*24*30});
  response.cookies.set(REFRESH_COOKIE,session.refresh_token,{...options,maxAge:60*60*24*30});
  response.headers.set("Cache-Control","private, no-store");
}
export function clearSession(response:NextResponse) {
  response.cookies.set(ACCESS_COOKIE,"",{path:"/",maxAge:0});
  response.cookies.set(REFRESH_COOKIE,"",{path:"/",maxAge:0});
  response.headers.set("Cache-Control","private, no-store");
}
