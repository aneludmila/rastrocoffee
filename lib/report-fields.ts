export function reportFields(text:string){
 const normalized=text.replace(/\r/g,"").replace(/[ \t]+/g," ");
 const scores=[...normalized.matchAll(/(?:PONTUA[ÇC][ÃA]O FINAL\s*|TOTAL SCA\s*|NOTA FINAL(?: SCA)?\s*[:\-]?\s*)(\d{1,3}(?:[,.]\d{1,2})?)(?:\s*pontos)?/gi)].map(m=>Number(m[1].replace(",",".")));
 const points=[...normalized.matchAll(/\b(\d{1,3}[,.]\d{1,2})\s*pontos\b/gi)].map(m=>Number(m[1].replace(",",".")));
 const distinct=[...new Set([...scores,...points].filter(n=>n>=0&&n<=100))];
 const section=normalized.match(/DESCRI[ÇC][ÃA]O SENSORIAL DETALHADA\s*([\s\S]*?)(?=CONSIDERA[ÇC][ÕO]ES|RECOMENDA[ÇC][ÕO]ES|\b06\s+ASSINATURAS|$)/i);
 const description=(section?.[1]||"").replace(/Helga Coffee Experts[^\n]*/gi,"").replace(/--\s*\d+\s*of\s*\d+\s*--/gi,"").replace(/\s+/g," ").trim().slice(0,2000);
 const vocabulary=["Abacaxi","Coco","Baunilha","Manga","Maracujá","Chocolate","Caramelo","Mel","Castanha","Amêndoa","Laranja","Limão","Morango","Jasmim","Canela"];
 const notes=vocabulary.filter(n=>new RegExp(`(?<![\\p{L}])${n}(?![\\p{L}])`,"iu").test(description));
 const reportLot=normalized.match(/\bLote\s*[:\-]?\s*([A-Z0-9][A-Z0-9_-]{1,79})\b/i)?.[1]||"";
 return {score:distinct.length===1?distinct[0]:null,method:/\bSCA\b/i.test(normalized)?"SCA":"",notes,description,reportLot,warnings:[...(distinct.length>1?["Foram encontradas pontuações diferentes. Confira a nota no laudo."]:distinct.length===0?["A pontuação final não foi identificada."]:[]),...(!description?["A descrição sensorial não foi identificada. Preencha conforme o laudo."]:[])]};
}
