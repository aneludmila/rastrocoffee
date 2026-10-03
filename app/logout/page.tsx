import Brand from "../brand";
export default function Logout(){return <main className="public"><Brand/><section className="panel mt"><h1>Sair da sua conta?</h1><form action="/api/auth/logout" method="post"><button className="button" type="submit">Sair</button></form><a href="/">Continuar no sistema</a></section></main>;}
