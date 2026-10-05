import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
async function load(path) {
 const source=fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
}
const policy=await load('lib/access-policy.ts');
const auth=await load('lib/auth-policy.ts');
const pdf=await load('lib/pdf-validation.ts');
const hash=await load('lib/trace.ts');
test('produtor só lê suas propriedades, lotes, etapas e documentos',()=>{
 const rows=[{id:'p1',kind:'producer',data:{}},{id:'p2',kind:'producer',data:{}},{id:'s1',kind:'property',data:{producerId:'p1'}},{id:'s2',kind:'property',data:{producerId:'p2'}},{id:'l1',kind:'lot',data:{propertyId:'s1'}},{id:'l2',kind:'lot',data:{propertyId:'s2'}},{id:'e1',kind:'stage',data:{lotId:'l1'}},{id:'d1',kind:'document',data:{lotId:'l1'}},{id:'d2',kind:'document',data:{lotId:'l2'}},{id:'a1',kind:'access',data:{}},{id:'v1',kind:'version',data:{lotId:'l1'}}];
 const visible=policy.producerRows(rows,'p1');
 assert.deepEqual(visible.map(r=>r.id),['p1','s1','l1','e1','d1']);
 assert.equal(policy.producerMayWrite('version',{lotId:'l1'},visible),false);
 assert.equal(policy.producerMayWrite('stage',{lotId:'l2'},visible),false);
 assert.equal(policy.producerMayWrite('stage',{lotId:'l1'},visible),true);
});
test('redirecionamento e origem rejeitam sites externos',()=>{
 for(const value of ['https://evil.example','//evil.example','/\\evil.example','/login','/logout'])assert.equal(auth.safeReturnPath(value),'/');
 assert.equal(auth.safeReturnPath('/produtor?id=123'),'/produtor?id=123');
 assert.equal(auth.validOrigin('https://evil.example','https://app.example'),false);
 assert.equal(auth.validOrigin(null,'https://app.example'),false);
 assert.equal(auth.validOrigin('https://app.example','https://app.example/api/records'),true);
});
test('PDF original e snapshot detectam mudanças de bytes e dados',async()=>{
 const original=new TextEncoder().encode('%PDF-1.4\nLaudo de teste');
 pdf.checkPdf(original);
 assert.throws(()=>pdf.checkPdf(new TextEncoder().encode('arquivo falso')));
 assert.throws(()=>pdf.checkPdf(new Uint8Array(pdf.MAX_PDF_BYTES+1)));
 const altered=original.slice();altered[altered.length-1]^=1;
 assert.notEqual(await hash.fileDigest(original.buffer),await hash.fileDigest(altered.buffer));
 assert.equal(await hash.digest({a:1,b:2}),await hash.digest({b:2,a:1}));
 assert.notEqual(await hash.digest({lot:{quantity:10}}),await hash.digest({lot:{quantity:11}}));
});
