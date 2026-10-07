import {reportFields} from "./report-fields";
export async function analyzePdf(bytes:Uint8Array){
 if(bytes.length>4*1024*1024)throw Error("Laudo excede o limite de análise.");
 const [{PDFParse},{getData}]=await Promise.all([import("pdf-parse"),import("pdf-parse/worker")]);
 PDFParse.setWorker(getData());
 const parser=new PDFParse({data:bytes,isEvalSupported:false});
 try{const result=await parser.getText({first:5});if(!result.text.trim())throw Error("PDF sem texto selecionável.");return reportFields(result.text);}finally{await parser.destroy();}
}
