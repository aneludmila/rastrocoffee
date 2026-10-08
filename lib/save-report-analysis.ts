import {analyzePdf} from "./analyze-pdf";
import {coffeeSchema,emptyCoffee} from "./coffee-schema";
import {coffeeProfile,saveCoffeeProfile} from "./repository";
export async function saveReportAnalysis(bytes:Uint8Array,lotId:string,owner:string,documentId:string){
 const fields=await analyzePdf(bytes);
 if(fields.score===null&&!fields.description&&!fields.notes.length)throw Error("Não foram identificados campos sensoriais. A ficha anterior foi preservada; preencha manualmente conforme o laudo.");
 const previous=await coffeeProfile(lotId,owner);
 const profile=coffeeSchema.parse({...emptyCoffee,...previous,score:fields.score,method:fields.method,notes:fields.notes,description:fields.description,reportLot:fields.reportLot,sourceDocumentId:documentId});
 await saveCoffeeProfile(lotId,owner,profile);
 return {...fields,profile,saved:true,sourceDocumentId:documentId};
}
