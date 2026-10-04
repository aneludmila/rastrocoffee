export const MAX_PDF_BYTES=4*1024*1024;
export function checkPdf(bytes:Uint8Array){if(bytes.length===0||bytes.length>MAX_PDF_BYTES)throw Error("Envie um PDF de até 4 MB.");if(new TextDecoder().decode(bytes.slice(0,5))!=="%PDF-")throw Error("O arquivo não tem o formato PDF esperado.");}
export function cleanFilename(name:string){return name.replace(/[\\/\r\n\x00-\x1f]/g,"_").slice(0,160)||"laudo.pdf";}
