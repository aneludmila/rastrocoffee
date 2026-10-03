import {NextResponse} from "next/server";
import {z} from "zod";
import {authRequest} from "@/lib/supabase";
import {setSession} from "@/lib/session";
export async function POST(req:Request) {
  try {
    const input=z.object({email:z.string().trim().email().max(254),password:z.string().min(1).max(256)}).parse(await req.json());
    const result=await authRequest("token?grant_type=password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});
    if(!result.ok)return NextResponse.json({error:"E-mail ou senha inválidos, ou e-mail ainda não confirmado."},{status:401});
    const session=await result.json();
    if(!session.user?.email_confirmed_at)return NextResponse.json({error:"Confirme seu e-mail antes de entrar."},{status:403});
    const response=NextResponse.json({ok:true});setSession(response,session);return response;
  } catch {return NextResponse.json({error:"Não foi possível entrar. Confira os campos e a configuração do Supabase."},{status:400});}
}
