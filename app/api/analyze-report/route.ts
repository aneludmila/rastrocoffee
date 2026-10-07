import {access,visibleRows} from "@/lib/access";
import {storage} from "@/lib/repository";
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
 return Response.json({...await analyzePdf(bytes),sourceDocumentId:doc.id});
 }catch(e){console.error("report extraction failed",e instanceof Error?e.message:"unknown");return Response.json({error:"Não foi possível extrair os campos desse PDF. Se ele for digitalizado ou tiver outro formato, preencha a ficha manualmente conforme o laudo."},{status:422});}
}
