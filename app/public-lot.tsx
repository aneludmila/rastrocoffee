"use client";
import {useEffect,useState} from "react";
import {ShieldCheck,RefreshCw,Leaf} from "lucide-react";
import Brand from "./brand";
import {Button} from "@/components/ui/button";

function date(value:string){return value.split("-").reverse().join("/");}
export default function PublicLot({id}:{id:string}){
 const [data,setData]=useState<any>(null),[error,setError]=useState(""),[qr,setQr]=useState(""),[loading,setLoading]=useState(false);
 async function load(){
  setLoading(true);setError("");
  try{
   const preview=new URLSearchParams(window.location.search).get("preview")==="1";
   const res=await fetch(`/api/public?id=${encodeURIComponent(id)}${preview?"&preview=1":""}`);
   if(res.status===429)throw Error("Muitas consultas em pouco tempo. Aguarde um minuto e tente novamente.");
   const result=await res.json();if(!res.ok)throw Error(result.error);setData(result);
  }catch(e:any){setError(e.message);}finally{setLoading(false);}
 }
 useEffect(()=>{
  load();
  // The shared QR always points to the consumer URL, without private-preview parameters.
  import("qrcode").then((m:any)=>m.default.toDataURL(`${window.location.origin}/lote/${encodeURIComponent(id)}`,{width:220,margin:2,color:{dark:"#183F32",light:"#ffffff"}})).then(setQr).catch(()=>{});
 },[id]);
 const snapshot=data?.snapshot,coffee=snapshot?.coffee||data?.reportAnalysis;
 const tastingFields:any[]=[["Variedade",coffee?.variety||snapshot?.lot?.variety],["Processamento",coffee?.process],["Altitude",coffee?.altitude!=null?`${coffee.altitude} m`:null],["Acidez",coffee?.acidity],["Corpo",coffee?.body],["Doçura",coffee?.sweetness],["Finalização",coffee?.finish]].filter(([,value])=>value!=null&&String(value).trim()!=="");
 const labels:any={verified:"Integridade conferida",mismatch:"Divergência nas informações",pending:"Registro em preparação",unavailable:"Verificação temporariamente indisponível"};
 return <div className="public consumer-page">
  <a href="/" className="brand"><Brand/></a>
  {error?<section className="panel"><p role="alert">{error}</p><Button onClick={load} disabled={loading}>Tentar novamente</Button></section>:!data?<p>Consultando o café…</p>:<>
   {data.preview&&<div className="alert">Prévia privada da versão. Publique pelo painel para liberar a consulta e o QR Code.</div>}
   <div className="consumer-heading"><span className="eyebrow">DA LAVOURA À SUA XÍCARA</span><h1>{snapshot.property.name}</h1><p>{snapshot.property.city}, {snapshot.property.state} · Lote {snapshot.lot.code}</p></div>
   <div className={`consumer-integrity ${data.status==="mismatch"?"consumer-integrity-error":""}`} role={data.status==="mismatch"?"alert":"status"}>
    <ShieldCheck size={20}/><div><strong>{labels[data.status]||labels.unavailable}</strong><span>{data.status==="verified"?"Os dados e os laudos correspondem ao registro deste lote.":data.status==="mismatch"?"Os dados ou um laudo apresentam diferenças em relação ao registro. Consulte o fornecedor.":data.status==="pending"?"Esta versão ainda aguarda a confirmação do registro.":"Tente conferir novamente em alguns instantes."}</span></div>
   </div>
   <div className="consumer-overview" style={!tastingFields.length?{gridTemplateColumns:"1fr"}:undefined}>
    <section className="panel consumer-origin"><span className="eyebrow">ORIGEM</span><h2>Da propriedade até você</h2><dl>{[["Produtor",snapshot.producer.name],["Espécie",snapshot.lot.species],["Safra",snapshot.lot.harvest],["Quantidade",`${snapshot.lot.quantity} kg`],["Versão",data.number]].map(([key,value]:any)=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></section>
    {!!tastingFields.length&&<section className="panel consumer-tasting"><span className="eyebrow">NA SUA XÍCARA</span><h2>Ficha do café</h2><dl>{tastingFields.map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></section>}
   </div>
   {coffee?.story&&<section className="panel consumer-section"><span className="eyebrow">QUEM CULTIVA</span><h2>A história deste café</h2><p className="coffee-prose">{coffee.story}</p></section>}
   <section className="panel consumer-section"><span className="eyebrow">TRAJETÓRIA</span><h2>Etapas registradas</h2><div className="consumer-stages">{snapshot.stages.map((stage:any)=><article key={stage.id}><span className="consumer-stage-dot"><Leaf size={16}/></span><div><small>{date(stage.date)}</small><h3>{stage.type}</h3>{stage.description&&<p>{stage.description}</p>}</div></article>)}</div>{!snapshot.stages.length&&<p className="muted">Nenhuma etapa incluída nesta versão.</p>}</section>
   <section className="panel consumer-section"><span className="eyebrow">AVALIAÇÃO DO CAFÉ</span><h2>Nota e observações sensoriais</h2>{data.reportAnalysis&&<p className="muted">Avaliação extraída do laudo incluído nesta versão, com o hash do arquivo conferido.</p>}{coffee?.score!=null?<div className="consumer-score"><strong>{Number(coffee.score).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}</strong><div>pontos<span>{coffee.method||""}</span></div></div>:<p className="muted">Pontuação ainda não incluída nesta versão.</p>}<h3>Observações e notas sensoriais</h3>{!!coffee?.notes?.length&&<div className="tasting-notes">{coffee.notes.map((note:string,index:number)=><span key={index}>{note}</span>)}</div>}{coffee?.description?<p className="coffee-prose">{coffee.description}</p>:<p className="muted">Descrição sensorial ainda não incluída nesta versão.</p>}</section>
   {coffee?.brewing&&<section className="panel consumer-section"><span className="eyebrow">SEU MOMENTO DO CAFÉ</span><h2>Sugestão de preparo</h2><p className="coffee-prose">{coffee.brewing}</p></section>}
   <div className="consumer-footer"><Button onClick={load} disabled={loading} variant="outline"><RefreshCw size={15}/>{loading?"Conferindo…":"Conferir integridade novamente"}</Button><p>A conferência de integridade preserva a correspondência com o registro. A origem e a qualidade são declaradas pelo produtor e pelo laudo.</p></div>
   {qr&&!data.preview&&<details className="consumer-share"><summary>Compartilhar este café por QR Code</summary><div className="qr"><img src={qr} alt="QR Code para consultar este café"/><a href={qr} download={`rastrocoffee-${snapshot.lot.code}.png`}>Baixar QR Code</a></div></details>}
  </>}
 </div>;
}
