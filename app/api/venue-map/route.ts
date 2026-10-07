import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=30;

const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));

function hasValidCoords(v:any){
  if(v?.latitude===null||v?.latitude===undefined||v?.longitude===null||v?.longitude===undefined)return false;
  if(String(v.latitude).trim()===''||String(v.longitude).trim()==='')return false;
  const lat=Number(v.latitude),lng=Number(v.longitude);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return false;
  // 0,0 is the Gulf of Guinea and is never a Prague/Hanspaulka venue.
  if(Math.abs(lat)<0.0001&&Math.abs(lng)<0.0001)return false;
  // All PSMF pitches used by this team should be in/around Czechia.
  if(lat<48||lat>51.5||lng<12||lng>19)return false;
  return true;
}


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
      if(hasValidCoords(v))continue;
      if(!v.address)continue;
      v.latitude=null;v.longitude=null;
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
        .filter(v=>hasValidCoords(v))
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
