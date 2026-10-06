// Runs the production Next.js server against a local Supabase HTTP double.
// No real Supabase project or Solana transaction is created.
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
const adminId=randomUUID(),producerId=randomUUID();
const users={admin:{id:adminId,email:'admin@test.example',email_confirmed_at:new Date().toISOString(),user_metadata:{}},producer:{id:producerId,email:'producer@test.example',email_confirmed_at:new Date().toISOString(),user_metadata:{rastrocoffee_admin_owner:adminId}},reviewer:{id:randomUUID(),email:'reviewer@test.example',email_confirmed_at:new Date().toISOString(),user_metadata:{},app_metadata:{rastrocoffee_admin_owner:adminId}}};
const rows=[],objects=new Map(),profiles=[],publications=[];let calls=0;
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));}
const mock=http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,'http://local');const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);
 if(url.pathname.startsWith('/auth/v1/')){
  if(url.pathname==='/auth/v1/token'){
   const input=JSON.parse(body);const key=url.searchParams.get('grant_type')==='refresh_token'?(input.refresh_token==='refresh-admin'?'admin':null):Object.keys(users).find(k=>users[k].email===input.email&&input.password==='test-password');
   if(!key)return json(res,400,{error:'invalid_grant'});
   return json(res,200,{access_token:key,refresh_token:'refresh-'+key,user:users[key]});
  }
  if(url.pathname==='/auth/v1/user')return users[req.headers.authorization?.replace('Bearer ','')]?json(res,200,users[req.headers.authorization.replace('Bearer ','')]):json(res,401,{error:'invalid_token'});
  return json(res,200,{});
 }
 assert.equal(req.headers.apikey,'test-service-secret');calls++;
 if(['/rest/v1/coffee_profiles','/rest/v1/publications'].includes(url.pathname)){
  const table=url.pathname.endsWith('coffee_profiles')?profiles:publications;
  const matches=row=>[...url.searchParams].every(([k,v])=>['limit','on_conflict'].includes(k)||v.startsWith('eq.')&&String(row[k])===v.slice(3));
  if(req.method==='GET')return json(res,200,table.filter(matches));
  if(req.method==='POST'){const row=JSON.parse(body);const key=table===profiles?'lot_id':'version_id';const found=table.find(r=>r[key]===row[key]);if(found&&table===profiles)Object.assign(found,row);else if(!found)table.push({...row,published_at:new Date().toISOString()});return json(res,201,{});}
  if(req.method==='DELETE'){for(let i=table.length-1;i>=0;i--)if(matches(table[i]))table.splice(i,1);return json(res,200,{});}
 }
 if(url.pathname==='/rest/v1/records'){
  const matches=row=>[...url.searchParams].every(([key,value])=>{
   if(['limit','offset','order'].includes(key))return true;
   const actual=key.startsWith('data->>')?row.data[key.slice(7)]:row[key];
   return value==='is.null'?actual==null:value.startsWith('eq.')?String(actual)===value.slice(3):false;
  });
  if(req.method==='GET'){let result=rows.filter(matches);const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||1000);return json(res,200,result.slice(offset,offset+limit));}
  if(req.method==='POST'){rows.push(JSON.parse(body));return json(res,201,{});}
  if(req.method==='DELETE'){for(let i=rows.length-1;i>=0;i--)if(matches(rows[i]))rows.splice(i,1);return json(res,200,{});}
  if(req.method==='PATCH'){const result=rows.filter(matches);for(const row of result)Object.assign(row,JSON.parse(body));return json(res,200,result);}
 }
 if(url.pathname.startsWith('/storage/v1/object/')){
  if(req.method==='POST'){assert.equal(req.headers['x-upsert'],'false');objects.set(url.pathname,body);return json(res,200,{});}
  if(req.method==='DELETE'){objects.delete(url.pathname);return json(res,200,{});}
  const data=objects.get(url.pathname);if(!data)return json(res,404,{});res.writeHead(200,{'Content-Type':'application/pdf'});return res.end(data);
 }
 json(res,404,{});
 }catch(e){console.error(e);json(res,500,{error:'Mock failure'});}
});
await new Promise(r=>mock.listen(Number(process.env.SUPABASE_MOCK_PORT||0),'127.0.0.1',r));
const allocator=http.createServer();await new Promise(r=>allocator.listen(Number(process.env.NEXT_TEST_PORT||0),'127.0.0.1',r));const port=allocator.address().port;await new Promise(r=>allocator.close(r));
const origin=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','-p',String(port)],{env:{...process.env,NODE_ENV:'production',SUPABASE_URL:`http://127.0.0.1:${mock.address().port}`,SUPABASE_ANON_KEY:'test-anon',SUPABASE_SERVICE_ROLE_KEY:'test-service-secret',ADMIN_EMAIL:'admin@test.example',SUPABASE_STORAGE_BUCKET:'laudos'},stdio:['ignore','pipe','pipe']});
let logs='';child.stdout.on('data',b=>{logs+=b;if(process.env.DEBUG_TEST)process.stdout.write(b)});child.stderr.on('data',b=>{logs+=b;if(process.env.DEBUG_TEST)process.stderr.write(b)});
async function request(path,options={}) {return fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(3000),...options,headers:{Origin:origin,...options.headers}});}
async function api(path,cookie,data,method='POST') {
 const response=await request(path,{method,headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(data)});
 return {status:response.status,data:await response.json()};
}
async function login(email){const response=await request('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'test-password'})});assert.equal(response.status,200);const cookies=response.headers.getSetCookie();assert.ok(cookies.every(s=>s.includes('HttpOnly')&&s.includes('Secure')));return cookies.map(s=>s.split(';')[0]).join('; ');}
try{
 let ready=false;for(let i=0;i<20;i++){try{if((await request('/login')).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,logs);
 assert.equal((await request('/')).status,307);
 assert.equal((await request('/api/records',{headers:{'oai-authenticated-user-id':adminId,'oai-authenticated-user-email':users.admin.email}})).status,403);
 assert.equal((await request('/api/auth/login',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'})).status,403);
 const admin=await login(users.admin.email),producer=await login(users.producer.email);
 assert.equal((await request('/api/records',{headers:{Cookie:producer}})).status,403);
 const create=async(kind,data)=>{const r=await api('/api/records',admin,{kind,data});assert.equal(r.status,200,JSON.stringify(r));return r.data.id;};
 const p1=await create('producer',{name:'Produtor Um'}),p2=await create('producer',{name:'Produtor Dois'});
 const prop1=await create('property',{name:'Sítio Um',producerId:p1,city:'Ariquemes',state:'RO'}),prop2=await create('property',{name:'Sítio Dois',producerId:p2,city:'Ariquemes',state:'RO'});
 assert.equal((await api('/api/access',admin,{producerId:p1,email:users.producer.email})).status,200);
 const reviewer=await login(users.reviewer.email);
 const lotId=await create('lot',{code:'LOTE-TESTE',propertyId:prop1,species:'Canéfora',variety:'VR25',harvest:'2026',quantity:30});
 const shared=await (await request('/api/records',{headers:{Cookie:reviewer}})).json();assert.ok(shared.some(r=>r.id===lotId));
 const visible=await (await request('/api/records',{headers:{Cookie:producer}})).json();assert.ok(visible.some(r=>r.id===lotId));assert.ok(!visible.some(r=>r.id===p2||r.id===prop2||r.kind==='access'));
 assert.equal((await api('/api/records',producer,{kind:'lot',data:{propertyId:prop2}})).status,403);
 assert.equal((await api('/api/records',producer,{kind:'stage',data:{lotId,type:'Colheita',date:'2026-01-01',description:''}})).status,200);
 assert.equal((await api('/api/records',producer,{kind:'stage',data:{lotId,type:'Colheita',date:'2026-01-01',description:''}})).status,400);
 assert.equal((await api('/api/records',producer,{kind:'version',data:{lotId}})).status,403);
 const pdf=Buffer.from('%PDF-1.4\nLaudo de teste original');const form=new FormData();form.set('lotId',lotId);form.set('file',new Blob([pdf],{type:'application/pdf'}),'laudo.pdf');
 const uploaded=await request('/api/documents',{method:'POST',headers:{Cookie:producer},body:form});assert.equal(uploaded.status,200);const doc=await uploaded.json();assert.equal(doc.hash,createHash('sha256').update(pdf).digest('hex'));
 assert.equal((await request('/api/documents?id='+doc.id)).status,403);
 const profile={reportLot:'1026',reportDate:'2026-08-31',variety:'VR25',score:86.25,method:'SCA',notes:['Abacaxi','Coco'],description:'Doce frutado',acidity:'Alta',body:'Aveludado',sweetness:'Doce',finish:'Longo',process:'Fermentado',altitude:180,story:'',brewing:'',sourceDocumentId:doc.id};
 assert.equal((await api('/api/coffee',producer,{lotId,profile})).status,200);
 assert.equal((await api('/api/coffee',producer,{lotId:prop2,profile})).status,403);
 assert.equal((await api('/api/coffee',producer,{lotId,profile:{...profile,sourceDocumentId:p2}})).status,400);
 const generated=await api('/api/records',reviewer,{kind:'version',data:{lotId}});assert.equal(generated.status,200);const versionId=generated.data.id;assert.equal(rows.find(r=>r.id===versionId).owner,adminId);
 assert.deepEqual(rows.find(r=>r.id===versionId).data.snapshot.coffee,profile);
 await api('/api/coffee',producer,{lotId,profile:{...profile,score:80}});
 assert.equal(rows.find(r=>r.id===versionId).data.snapshot.coffee.score,86.25);
 assert.equal((await request('/api/public?id='+versionId)).status,404);
 assert.equal((await request('/api/public?id='+versionId+'&preview=1',{headers:{Cookie:producer}})).status,404);
 assert.equal((await api('/api/publish',producer,{id:versionId,publish:true})).status,403);
 assert.equal((await api('/api/publish',admin,{id:versionId,publish:true})).status,409);
 assert.equal((await request(`/api/documents?id=${doc.id}&version=${versionId}`)).status,403);
 const previewPath='/api/public?id='+versionId+'&preview=1';
 let published=await (await request(previewPath,{headers:{Cookie:admin}})).json();assert.equal(published.preview,true);assert.equal(published.status,'pending');assert.equal(published.documents[0].status,'matched');
 const downloaded=await request(`/api/documents?id=${doc.id}&version=${versionId}`,{headers:{Cookie:admin}});assert.equal(downloaded.status,200);assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()),pdf);
 assert.equal((await request(`/api/documents?id=${doc.id}&version=${randomUUID()}`)).status,403);
 objects.set([...objects.keys()][0],Buffer.from('%PDF-1.4\nArquivo alterado'));
 published=await (await request(previewPath,{headers:{Cookie:admin}})).json();assert.equal(published.status,'mismatch');assert.equal(published.documents[0].status,'mismatch');
 const v=rows.find(r=>r.id===versionId);v.data.signature='1'.repeat(88);v.data.confirmedAt=1791300000;
 assert.equal((await api('/api/publish',admin,{id:versionId,publish:true})).status,400); // altered PDF prevents publication before RPC
 v.data.signature=null;delete v.data.confirmedAt;
 // Simulate the publication table's read gate without sending a real Devnet transaction.
 publications.push({version_id:versionId,owner:adminId,published_at:new Date().toISOString()});
 assert.equal((await request('/api/public?id='+versionId)).status,200);
 assert.equal((await request(`/api/documents?id=${doc.id}&version=${versionId}`)).status,200);
 assert.equal((await api('/api/publish',admin,{id:versionId,publish:false})).status,200);
 assert.equal((await request('/api/public?id='+versionId)).status,404);
 const refreshed=await request('/api/records',{headers:{Cookie:'rc-access=expired; rc-refresh=refresh-admin'}});assert.equal(refreshed.status,200);assert.ok(refreshed.headers.getSetCookie().some(s=>s.startsWith('rc-access=admin')));
 const grant=rows.find(r=>r.kind==='access');assert.equal((await api('/api/access',admin,{id:grant.id},'DELETE')).status,200);
 assert.equal((await request('/api/records',{headers:{Cookie:producer}})).status,403);
 const logout=await request('/api/auth/logout',{method:'POST',headers:{Cookie:admin}});assert.equal(logout.status,303);assert.ok(logout.headers.getSetCookie().every(s=>s.includes('Max-Age=0')));
 console.log('PASS: production routes, login, refresh, origin protection, producer isolation/revocation, PDFs, snapshots and public integrity ('+calls+' backend calls).');
}catch(e){console.error(logs);throw e;}
finally{child.kill('SIGTERM');mock.close();}
