"use client";
import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
export default function LoginForm({returnTo}:{returnTo:string}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function login(e:React.FormEvent<HTMLFormElement>) {
   e.preventDefault();setBusy(true);setError("");const fields=new FormData(e.currentTarget);
   try {const response=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:fields.get("email"),password:fields.get("password")})});
    const data=await response.json();if(!response.ok)throw new Error(data.error);
    window.location.assign(returnTo);
   }catch(e:any){setError(e.message||"Não foi possível entrar.");setBusy(false);}
 }
 return <form onSubmit={login} className="form"><label>E-mail<Input name="email" type="email" autoComplete="username" required maxLength={254}/></label><label>Senha<Input name="password" type="password" autoComplete="current-password" required maxLength={256}/></label>{error&&<p className="form-error" role="alert">{error}</p>}<Button disabled={busy} type="submit">{busy?"Entrando…":"Entrar"}</Button></form>;
}
