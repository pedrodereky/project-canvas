import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/app/AuthScreen";
export const Route=createFileRoute("/auth")({head:()=>({meta:[{title:"Entrar | Forma"},{name:"description",content:"Entre ou crie sua conta no Forma."},{property:"og:title",content:"Entrar | Forma"},{property:"og:description",content:"Entre ou crie sua conta no Forma."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}),component:AuthScreen});
