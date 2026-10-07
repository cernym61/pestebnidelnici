import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=30;

const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));

async function geocode(address:string,name:string){
  const q=[address,name,"Česko"].filter(Boolean).join(", ");
  const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=cz&q=${encodeURIComponent(q)}`;
  const r=await fetch(url,{
    headers:{
      "User-Agent":"PestebniDelnici-Kabina/1.0 (https://www.pestebnidelnici.cz)",
      "Accept-Language":"cs"
    },
    cache:"no-store"
  });
  if(!r.ok)return null;
  const data=await r.json().catch(()=>[]);
  const first=Array.isArray(data)?data[0]:null;
  if(!first)return null;
  const latitude=Number(first.lat),longitude=Number(first.lon);
  return Number.isFinite(latitude)&&Number.isFinite(longitude)?{latitude,longitude}:null;
}

export async function GET(){
  try{
    const admin=getSupabaseAdmin();
    const {data,error}=await admin.from("venues")
      .select("code,name,address,notes,latitude,longitude")
      .order("code");
    if(error)throw error;

    const venues=(data||[]) as any[];

    // Geocode only missing coordinates, once; store them so subsequent opens are instant.
    for(const v of venues){
      if(Number.isFinite(Number(v.latitude))&&Number.isFinite(Number(v.longitude)))continue;
      if(!v.address)continue;
      const point=await geocode(String(v.address),String(v.name||v.code));
      if(point){
        v.latitude=point.latitude;v.longitude=point.longitude;
        await admin.from("venues").update(point).eq("code",v.code);
      }
      await sleep(900);
    }

    const [{data:matches,error:me}]=await Promise.all([
      admin.from("historical_matches").select("venue_code").not("venue_code","is",null)
    ]);
    if(me)console.warn("venue-map historical count",me.message);

    const counts=new Map<string,number>();
    for(const m of matches||[]){
      if(m.venue_code)counts.set(m.venue_code,(counts.get(m.venue_code)||0)+1);
    }

    const {data:future}=await admin.from("matches")
      .select("venue_code,kickoff,home_score")
      .is("home_score",null)
      .order("kickoff")
      .limit(1);
    const nextVenue=future?.[0]?.venue_code||null;

    return NextResponse.json({
      venues:venues
        .filter(v=>Number.isFinite(Number(v.latitude))&&Number.isFinite(Number(v.longitude)))
        .map(v=>({
          code:v.code,name:v.name,address:v.address,notes:v.notes,
          latitude:Number(v.latitude),longitude:Number(v.longitude),
          matches:counts.get(v.code)||0,nextMatch:v.code===nextVenue
        })),
      nextVenue
    },{headers:{"Cache-Control":"no-store"}});
  }catch(e:any){
    return NextResponse.json({error:e?.message||"Venue map failed"},{status:500});
  }
}
