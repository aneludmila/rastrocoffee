import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../app/workspace.tsx',import.meta.url),'utf8');
const functionSource=source.slice(source.indexOf('async function anchor(v:R)'),source.indexOf('async function associateAnchor'))
 .replace('await import("@solana/web3.js")','sdk');
const js=ts.transpileModule(functionSource,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
async function run(overrides={}){
 const state={pending:{},feedback:null,sent:0,saved:0,storage:new Map(),busy:false};
 const setter=key=>value=>state[key]=typeof value==='function'?value(state[key]):value;
 const connection={getBalance:async()=>1,getLatestBlockhashAndContext:async()=>({context:{slot:1},value:{blockhash:'fresh',lastValidBlockHeight:10}}),isBlockhashValid:async()=>({value:overrides.valid!==false}),sendRawTransaction:async()=>{state.sent++;return 'signature';},confirmTransaction:async()=>{if(overrides.confirmError)throw Error(overrides.confirmError);return {value:{err:overrides.chainError||null}};}};
 const provider={isPhantom:true,publicKey:{toString:()=> 'wallet'},connect:async()=>{},signTransaction:async()=>{if(overrides.reject)throw Object.assign(Error('User rejected'),{code:4001});return {serialize:()=>new Uint8Array()};}};
 class Transaction{add(){return this;}}
 const sdk={Connection:class{constructor(){return connection;}},Transaction,TransactionInstruction:class{},PublicKey:class{}};
 const env={pendingAnchors:{},setBusy:setter('busy'),setError:()=>{},setNotice:()=>{},setAnchorFeedback:setter('feedback'),setPendingAnchors:setter('pending'),window:{phantom:{solana:provider}},sdk,Buffer,memoFor:()=> 'memo',pdfMemo:()=> 'pdf',localStorage:{setItem:(k,v)=>state.storage.set(k,v),removeItem:k=>state.storage.delete(k)},associateAnchor:async()=>{state.saved++;if(overrides.saveError)throw Error(overrides.saveError);}};
 const execute=new Function(...Object.keys(env),js+';return anchor({id:"v1",data:{hash:"hash",snapshot:{documents:[]}}});');
 await execute(...Object.values(env));return state;
}
test('transação expirada não é enviada e pede nova assinatura',async()=>{const s=await run({valid:false});assert.equal(s.sent,0);assert.equal(s.saved,0);assert.match(s.feedback.message,/nova transação/);assert.equal(s.busy,false);});
test('fluxo válido guarda comprovante antes de salvar no site',async()=>{const s=await run();assert.equal(s.sent,1);assert.equal(s.saved,1);assert.equal(s.pending.v1.signature,'signature');assert.ok(s.storage.has('rastrocoffee:anchor:v1'));});
test('falha de confirmação preserva assinatura para recuperar sem novo envio',async()=>{const s=await run({confirmError:'timeout'});assert.equal(s.sent,1);assert.equal(s.saved,0);assert.equal(s.pending.v1.signature,'signature');assert.match(s.feedback.message,/Verificar registro enviado/);});
test('falha no site preserva comprovante e mostra erro perto da versão',async()=>{const s=await run({saveError:'HTTP 429'});assert.equal(s.sent,1);assert.ok(s.storage.has('rastrocoffee:anchor:v1'));assert.equal(s.feedback.detail,'HTTP 429');});
test('cancelamento na Phantom não envia transação',async()=>{const s=await run({reject:true});assert.equal(s.sent,0);assert.match(s.feedback.message,/cancelada/);});
test('falha confirmada pela rede libera nova tentativa e remove pendência',async()=>{const s=await run({chainError:{InstructionError:[0,'failed']}});assert.equal(s.saved,0);assert.deepEqual(s.pending,{});assert.equal(s.storage.size,0);});
