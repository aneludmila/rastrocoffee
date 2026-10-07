import {access,visibleRows} from "@/lib/access";
import {storage} from "@/lib/repository";
import {reportFields} from "@/lib/report-fields";
export const runtime="nodejs";
export async function POST(req:Request){
 const a=await access();if(!a||a.role!=="admin")return Response.json({error:"Somente a administradora pode revisar a análise do laudo."},{status:403});
 try{
 const {documentId,lotId}=await req.json();
 const rows=await visibleRows(a),doc=rows.find(r=>r.kind==="document"&&r.id===documentId&&r.data.lotId===lotId);
 if(!doc)return Response.json({error:"Laudo não encontrado neste lote."},{status:404});
 const stored=await storage.get(doc.data.key);if(!stored)throw Error("Arquivo indisponível.");
 const bytes=new Uint8Array(await new Response(stored.body).arrayBuffer());
 if(bytes.length>4*1024*1024)throw Error("Laudo excede o limite de análise.");
 const {PDFParse}=await import("pdf-parse");
 const parser=new PDFParse({data:bytes,isEvalSupported:false});
 try{const result=await parser.getText({first:5});if(!result.text.trim())throw Error("PDF sem texto selecionável. Preencha a ficha manualmente conforme o laudo.");return Response.json({...reportFields(result.text),sourceDocumentId:doc.id});}finally{await parser.destroy();}
 }catch{return Response.json({error:"Não foi possível extrair os campos desse PDF. Se ele for digitalizado ou tiver outro formato, preencha a ficha manualmente conforme o laudo."},{status:422});}
}
