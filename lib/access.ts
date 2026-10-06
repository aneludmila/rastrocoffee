import {getUser,adminEmail} from "./auth";
import {findGrant,ownerRows} from "./repository";
import {producerRows} from "./access-policy";
export async function access(){
 const user=await getUser();if(!user)return null;
 if(user.email.trim().toLowerCase()===adminEmail())return {role:"admin" as const,owner:user.userId,user,producerId:null};
 if(user.adminOwner)return {role:"admin" as const,owner:user.adminOwner,user,producerId:null};
 const grant=await findGrant(user.email.trim().toLowerCase());
 if(!grant)return {role:"denied" as const,user};
 return {role:"producer" as const,user,owner:grant.owner,producerId:grant.data.producerId as string};
}
export const readRows=ownerRows;
export async function visibleRows(a:any){const rows=await readRows(a.owner);return a.role==="producer"?producerRows(rows,a.producerId):rows;}
