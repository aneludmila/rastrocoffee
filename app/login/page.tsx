import Brand from "../brand";
import LoginForm from "./form";
import {safeReturnPath} from "@/lib/auth-policy";
export const dynamic="force-dynamic";
export default async function Login({searchParams}:{searchParams:Promise<{return_to?:string}>}) {
 const params=await searchParams;
 return <main className="public"><Brand/><section className="panel mt"><span className="eyebrow">BEM-VINDO AO RASTROCOFFEE</span><h1>Entre na sua conta</h1><p>Use o e-mail e a senha cadastrados para acompanhar seu café.</p><LoginForm returnTo={safeReturnPath(params.return_to)}/><p className="muted">Primeiro acesso? Peça à administradora sua conta e o vínculo com sua propriedade.</p></section></main>;
}
