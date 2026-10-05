export function canonical(value:any):string {if(Array.isArray(value)) return "["+value.map(canonical).join(",")+"]";if(value&&typeof value==="object")return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";return JSON.stringify(value);}
export async function digest(value:any){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(canonical(value)));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("");}
export function memoFor(id:string,hash:string){return `RastroCoffee:v1:${id}:${hash}`;}

export async function fileDigest(bytes:ArrayBuffer){const hash=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,"0")).join("");}
export function pdfMemo(id:string,hash:string){return `RastroCoffee:pdf:v1:${id}:${hash}`;}
