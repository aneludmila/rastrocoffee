import {coffeeSchema,emptyCoffee} from "@/lib/coffee-schema";
import {access,visibleRows} from "@/lib/access";
import {storage,coffeeProfile,saveCoffeeProfile} from "@/lib/repository";
import {analyzePdf} from "@/lib/analyze-pdf";
export const runtime="nodejs";
export async function POST(req:Request){
 const a=await access();if(!a||a.role!=="admin")return Response.json({error:"Somente a administradora pode revisar a análise do laudo."},{status:403});
 try{
 const {documentId,lotId}=await req.json();
 const rows=await visibleRows(a),doc=rows.find(r=>r.kind==="document"&&r.id===documentId&&r.data.lotId===lotId);
 if(!doc)return Response.json({error:"Laudo não encontrado neste lote."},{status:404});
 const stored=await storage.get(doc.data.key);if(!stored)throw Error("Arquivo indisponível.");
 const bytes=new Uint8Array(await new Response(stored.body).arrayBuffer());
 const fields=await analyzePdf(bytes);
 if(fields.score===null&&!fields.description&&!fields.notes.length)return Response.json({error:"Não foram identificados campos sensoriais. A ficha anterior foi preservada; preencha manualmente conforme o laudo."},{status:422});
 const previous=await coffeeProfile(lotId,a.owner!);
 const profile=coffeeSchema.parse({...emptyCoffee,...previous,score:fields.score,method:fields.method,notes:fields.notes,description:fields.description,reportLot:fields.reportLot,sourceDocumentId:doc.id});
 try{await saveCoffeeProfile(lotId,a.owner!,profile);}catch{return Response.json({error:"O PDF foi analisado, mas não foi possível salvar a ficha. Tente novamente."},{status:503});}
 return Response.json({...fields,profile,saved:true,sourceDocumentId:doc.id});
 }catch(e){console.error("report extraction failed",e instanceof Error?e.message:"unknown");return Response.json({error:"Não foi possível extrair os campos desse PDF. Se ele for digitalizado ou tiver outro formato, preencha a ficha manualmente conforme o laudo."},{status:422});}
}
