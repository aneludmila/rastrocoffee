import type {Metadata} from "next";
import {Fraunces,Montserrat,Source_Sans_3} from "next/font/google";
import "./globals.css";

const fraunces=Fraunces({subsets:["latin"],variable:"--font-heading",display:"swap"});
const montserrat=Montserrat({subsets:["latin"],variable:"--font-accent",display:"swap"});
const sourceSans=Source_Sans_3({subsets:["latin"],variable:"--font-body",display:"swap"});

export const metadata:Metadata={title:"RastroCoffee | Rastreabilidade do café",description:"Origem, etapas e verificação de integridade de lotes de café.",icons:{icon:[{url:"/favicon-bean-original.png",type:"image/png",sizes:"256x256"}],shortcut:"/favicon-bean-original.png"}};

export default function Layout({children}:{children:React.ReactNode}){
 return <html lang="pt-BR"><body className={`${fraunces.variable} ${montserrat.variable} ${sourceSans.variable}`}>{children}</body></html>;
}
