// Supabase Edge Function: crazi-admin
// Secrets: CRAZI_ADMIN_PASSWORD and SUPABASE_SERVICE_ROLE_KEY
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-admin-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const enc=new TextEncoder();
function b64(bytes:Uint8Array){let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/=/g,"").replace(/\\+/g,"-").replace(/\\//g,"_")}
function unb64(s:string){s=s.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function sign(payload:string,secret:string){const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return b64(new Uint8Array(await crypto.subtle.sign("HMAC",key,enc.encode(payload))))}
async function validToken(token:string,secret:string){try{const [payload,sig]=token.split(".");if(!payload||!sig)return false;const expected=await sign(payload,secret);if(expected!==sig)return false;const data=JSON.parse(new TextDecoder().decode(unb64(payload)));return data.exp>Date.now()}catch{return false}}
serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const body=await req.json();const action=body.action;
  const adminPass=Deno.env.get("CRAZI_ADMIN_PASSWORD")||"";
  if(action==="login"){
   if(!adminPass||body.password!==adminPass)return Response.json({error:"Invalid admin password"},{status:401,headers:cors});
   const secret=Deno.env.get("CRAZI_ADMIN_PASSWORD")!;
   const payload=b64(enc.encode(JSON.stringify({exp:Date.now()+8*60*60*1000,role:"admin"})));
   return Response.json({token:payload+"."+await sign(payload,secret)},{headers:cors});
  }
  const secret=Deno.env.get("CRAZI_ADMIN_PASSWORD")||"";
  if(!await validToken(req.headers.get("x-admin-token")||"",secret))return Response.json({error:"Admin session expired"},{status:401,headers:cors});
  const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let result:any;
  if(action==="posts")result=await db.from("posts").select("*").order("created_at",{ascending:false}).limit(100);
  else if(action==="apps")result=await db.from("applications").select("*").order("created_at",{ascending:false}).limit(100);
  else if(action==="delete_posts")result=await db.from("posts").delete().eq("id",body.id);
  else if(action==="delete_apps")result=await db.from("applications").delete().eq("id",body.id);
  else if(action==="update_application")result=await db.from("applications").update({status:body.status}).eq("id",body.id);
  else if(action==="notice")result=await db.from("notices").insert({message:body.message});
  else return Response.json({error:"Unknown action"},{status:400,headers:cors});
  if(result.error)throw result.error;
  return Response.json({items:result.data||[]},{headers:cors});
 }catch(e){return Response.json({error:String(e?.message||e)},{status:500,headers:cors})}
});
