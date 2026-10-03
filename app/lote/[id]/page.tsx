import PublicLot from "../../public-lot";export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <PublicLot id={id}/>;}
