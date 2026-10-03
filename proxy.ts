import {NextRequest,NextResponse} from "next/server";
import {authRequest} from "./lib/supabase";
import {ACCESS_COOKIE,REFRESH_COOKIE,setSession,clearSession} from "./lib/session";
import {isMutation,validOrigin} from "./lib/auth-policy";
export async function proxy(request:NextRequest) {
  if(isMutation(request.method) && !validOrigin(request.headers.get("origin"),`${request.headers.get("x-forwarded-proto") === "https" ? "https:" : request.nextUrl.protocol}//${request.headers.get("host") || request.nextUrl.host}`))
    return NextResponse.json({error:"Origem da requisição não autorizada."},{status:403});
  const response=NextResponse.next();
  response.headers.set("Cache-Control","private, no-store");
  if(request.nextUrl.pathname.startsWith("/api/auth/"))return response;
  const token=request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh=request.cookies.get(REFRESH_COOKIE)?.value;
  if(!token && !refresh)return response;
  try {
    const check=token?await authRequest("user",{headers:{Authorization:`Bearer ${token}`}}):null;
    if(check?.ok)return response;
    // Refresh only expired/invalid sessions, never on a transient Auth outage.
    if(check && check.status!==401 && check.status!==403)return response;
    if(!refresh){clearSession(response);return response;}
    const refreshed=await authRequest("token?grant_type=refresh_token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({refresh_token:refresh})});
    if(!refreshed.ok){if(refreshed.status<500)clearSession(response);return response;}
    const session=await refreshed.json();
    request.cookies.set(ACCESS_COOKIE,session.access_token);
    request.cookies.set(REFRESH_COOKIE,session.refresh_token);
    const next=NextResponse.next({request:{headers:request.headers}});
    setSession(next,session);return next;
  } catch {return response;}
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.svg|brand-board.png).*)"]};
