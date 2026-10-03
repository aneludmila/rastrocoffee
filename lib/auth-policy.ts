export function safeReturnPath(value:string|null|undefined) {
  if(!value?.startsWith("/") || value.startsWith("//")) return "/";
  try {const url=new URL(value,"https://app.local");
    if(url.origin!=="https://app.local" || ["/login","/logout"].includes(url.pathname)) return "/";
    return url.pathname+url.search;
  } catch {return "/";}
}
export function isMutation(method:string) {return !["GET","HEAD","OPTIONS"].includes(method);}
export function validOrigin(origin:string|null,expected:string) {
  try {return !!origin && new URL(origin).origin===new URL(expected).origin;} catch{return false;}
}
