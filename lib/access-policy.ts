export type RecordRow={id:string;kind:string;data:any;created:string;owner?:string};
export function producerRows(rows:RecordRow[],producerId:string){const properties=new Set(rows.filter(r=>r.kind==="property"&&r.data.producerId===producerId).map(r=>r.id));const lots=new Set(rows.filter(r=>r.kind==="lot"&&properties.has(r.data.propertyId)).map(r=>r.id));return rows.filter(r=>r.kind==="producer"?r.id===producerId:r.kind==="property"?properties.has(r.id):r.kind==="lot"?lots.has(r.id):(r.kind==="stage"||r.kind==="document")?lots.has(r.data.lotId):false);}
export function producerMayWrite(kind:string,data:any,rows:RecordRow[]){return kind==="lot"?rows.some(r=>r.kind==="property"&&r.id===data.propertyId):kind==="stage"?rows.some(r=>r.kind==="lot"&&r.id===data.lotId):false;}

// Return only consumer links for published versions belonging to this producer.
export function producerPublications(rows:(RecordRow & {publishedAt?:string|null})[],producerId:string){
 const lots=new Set(producerRows(rows,producerId).filter(r=>r.kind==="lot").map(r=>r.id));
 return rows.filter(r=>r.kind==="version"&&r.publishedAt&&lots.has(r.data.lotId)).map(r=>({id:r.id,kind:"publication",created:r.created,data:{lotId:r.data.lotId,number:r.data.number}}));
}
