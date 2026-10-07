import "server-only";
import { backend } from "./supabase";
export type Row = {id:string;owner:string;kind:string;data:any;created:string};
function query(filters: Record<string,string>) {
  return new URLSearchParams(filters).toString();
}
export async function findRecord(id: string | null, kind: string, owner?: string): Promise<Row | null> {
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const filters: Record<string,string> = {id:`eq.${id}`,kind:`eq.${kind}`,limit:"1"};
  if (owner) filters.owner=`eq.${owner}`;
  const rows=await (await backend("/rest/v1/records?"+query(filters))).json();
  return rows[0] ?? null;
}
export async function findGrant(email:string): Promise<Row | null> {
  const rows=await (await backend("/rest/v1/records?"+query({kind:"eq.access","data->>email":`eq.${email}`,limit:"1"}))).json();
  return rows[0] ?? null;
}
export async function ownerRows(owner:string): Promise<Row[]> {
  const rows:Row[]=[];
  // Supabase commonly caps one request to 1000 rows; paginate instead of silently truncating.
  for(let offset=0;;) {
    const page:Row[]=await (await backend("/rest/v1/records?"+query({owner:`eq.${owner}`,order:"created.asc,id.asc",limit:"500",offset:String(offset)}))).json();
    rows.push(...page); if(!page.length){const deleted=new Set(rows.filter(r=>r.kind==="lot"&&r.data.deletedAt).map(r=>r.id));return rows.filter(r=>!deleted.has(r.id)&&!deleted.has(r.data.lotId));} offset+=page.length;
  }
}
export async function insertRecord(row:Row) {
  await backend("/rest/v1/records",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(row)});
}
export async function deleteGrant(id:string,owner:string) {
  await backend("/rest/v1/records?"+query({id:`eq.${id}`,owner:`eq.${owner}`,kind:"eq.access"}),{method:"DELETE"});
}
export async function anchorRecord(id:string,owner:string,data:any) {
  const result=await (await backend("/rest/v1/records?"+query({id:`eq.${id}`,owner:`eq.${owner}`,kind:"eq.version","data->>signature":"is.null"}),{method:"PATCH",headers:{"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({data})})).json();
  if(!result.length) throw new Error("Esta versão já foi registrada. Atualize a página.");
}
function objectPath(key:string) {
  const bucket=process.env.SUPABASE_STORAGE_BUCKET || "laudos";
  return "/storage/v1/object/"+[bucket,...key.split("/")].map(encodeURIComponent).join("/");
}
export const storage={
  async put(key:string,bytes:ArrayBuffer) {await backend(objectPath(key),{method:"POST",headers:{"Content-Type":"application/pdf","x-upsert":"false"},body:bytes});},
  async delete(key:string) {await backend(objectPath(key),{method:"DELETE"});},
  async get(key:string):Promise<Response|null> {return backend(objectPath(key));}
};

export async function coffeeProfile(lotId:string,owner:string) {
 const rows=await (await backend("/rest/v1/coffee_profiles?"+query({lot_id:`eq.${lotId}`,owner:`eq.${owner}`,limit:"1"}))).json();
 return rows[0]?.data ?? null;
}
export async function saveCoffeeProfile(lotId:string,owner:string,data:unknown) {
 await backend("/rest/v1/coffee_profiles?on_conflict=lot_id",{method:"POST",headers:{"Content-Type":"application/json",Prefer:"resolution=merge-duplicates"},body:JSON.stringify({lot_id:lotId,owner,data,updated_at:new Date().toISOString()})});
}
export async function publication(versionId:string,owner:string) {
 const rows=await (await backend("/rest/v1/publications?"+query({version_id:`eq.${versionId}`,owner:`eq.${owner}`,limit:"1"}))).json();
 return rows[0] ?? null;
}
export async function publications(owner:string) {
 return (await backend("/rest/v1/publications?"+query({owner:`eq.${owner}`}))).json();
}
export async function setPublication(versionId:string,owner:string,publish:boolean) {
 if(publish)await backend("/rest/v1/publications?on_conflict=version_id",{method:"POST",headers:{"Content-Type":"application/json",Prefer:"resolution=ignore-duplicates"},body:JSON.stringify({version_id:versionId,owner})});
 else await backend("/rest/v1/publications?"+query({version_id:`eq.${versionId}`,owner:`eq.${owner}`}),{method:"DELETE"});
}

// Logical deletion preserves attachments and audit data; anchored history is never deleted.
export async function removeLot(id:string,owner:string,data:any){
 const rows=await (await backend("/rest/v1/records?"+query({id:`eq.${id}`,owner:`eq.${owner}`,kind:"eq.lot"}),{method:"PATCH",headers:{"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({data})})).json();
 if(!rows.length)throw new Error("Lote não encontrado para exclusão.");
}
