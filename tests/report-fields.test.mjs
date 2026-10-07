import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync('lib/report-fields.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {reportFields}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('extrai nota final e descrição sem confundir notas de atributos',()=>{const r=reportFields('SCA Corpo 8,25 TOTAL SCA 86,25\nPONTUAÇÃO FINAL\n86,25 pontos\nLote 1026\nDESCRIÇÃO SENSORIAL DETALHADA\nAbacaxi, coco, baunilha, manga e maracujá.\nCONSIDERAÇÕES / RECOMENDAÇÕES NA');assert.equal(r.score,86.25);assert.equal(r.reportLot,'1026');assert.deepEqual(r.notes,['Abacaxi','Coco','Baunilha','Manga','Maracujá']);assert.equal(r.description,'Abacaxi, coco, baunilha, manga e maracujá.');assert.deepEqual(r.warnings,[]);});
test('pontuações conflitantes exigem revisão e não escolhem uma automaticamente',()=>{assert.equal(reportFields('TOTAL SCA 86,25\nPONTUAÇÃO FINAL 90,00 pontos').score,null);});
test('texto vazio ou sem pontuação não inventa avaliação',()=>{const r=reportFields('Corpo 8,25\nSafra 2026');assert.equal(r.score,null);assert.equal(r.description,'');assert.deepEqual(r.notes,[]);assert.equal(r.warnings.length,2);});
test('PDF não pode ser baixado anonimamente mesmo pelo link de uma versão publicada',async()=>{
 const source=fs.readFileSync('app/api/documents/route.ts','utf8');
 const get=ts.transpileModule(source.slice(source.indexOf('export async function GET')).replace('export async','async'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 let storageReads=0;
 const run=new Function('findRecord','access','visibleRows','storage',get+';return GET(new Request("https://example.com/api/documents?id=doc&version=v1"));');
 const res=await run(async(id,kind)=>kind==='document'?{owner:'owner',data:{name:'report.pdf',key:'key'}}:{data:{snapshot:{documents:[{id:'doc'}]}}},async()=>null,async()=>[],{get:async()=>{storageReads++;}});
 assert.equal(res.status,403);assert.equal(storageReads,0);
});

for(const valid of [true,false])test(`consulta pública ${valid?'extrai avaliação de PDF íntegro':'não analisa PDF adulterado'}`,async()=>{
 const source=fs.readFileSync('app/api/public/route.ts','utf8').replace(/^import .*;\n/gm,'');
 const js=ts.transpileModule(source.replace('export async','async'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 let reads=0;const snapshot={lot:{id:'lot'},documents:[{id:'doc',hash:'expected'}]};
 const run=new Function('access','findRecord','storage','publication','digest','fileDigest','checkTransaction','analyzePdf',js+';return GET(new Request("https://example.com/api/public?id=version"));');
 const res=await run(async()=>null,async(id)=>id==='version'?{id:'version',owner:'owner',data:{snapshot,hash:'snapshot',signature:'sig'}}:{data:{key:'key'}},{get:async()=>new Response('pdf')},async()=>({published_at:'today'}),async()=> 'snapshot',async()=>valid?'expected':'changed',async()=>({match:true}),async()=>{reads++;return {score:86.25,notes:['Coco'],description:'Descrição'};});
 const d=await res.json();assert.equal(res.status,200);assert.equal(reads,valid?1:0);assert.equal(d.snapshot.coffee,undefined);assert.equal(d.reportAnalysis?.score,valid?86.25:undefined);assert.equal(d.status,valid?'verified':'mismatch');
});
