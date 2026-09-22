import { createFileRoute } from "@tanstack/react-router";
import { EditorShell } from "@/components/editor/EditorShell";
import { ShareDialog } from "@/components/app/ShareDialog";
export const Route=createFileRoute("/_authenticated/project/$projectId")({validateSearch:(s:Record<string,unknown>)=>({share:s["share"]===true||s["share"]==="true"}),head:()=>({meta:[{title:"Editor | Forma"},{name:"description",content:"Editor colaborativo de projetos 3D."},{property:"og:title",content:"Editor | Forma"},{property:"og:description",content:"Editor colaborativo de projetos 3D."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}),component:Page});
function Page(){const {projectId}=Route.useParams(),{share}=Route.useSearch();return <><EditorShell projectId={projectId}/>{share&&<ShareDialog projectId={projectId}/>}</>}
