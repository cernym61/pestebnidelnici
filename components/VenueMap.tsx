"use client";

import { useEffect, useRef, useState } from "react";

type Point={
  code:string;
  name:string;
  address:string;
  notes:string|null;
  latitude:number;
  longitude:number;
  matches:number;
  nextMatch:boolean;
};

export default function VenueMap({lang,nextVenue,onVenueClick}:{lang:"cs"|"en";nextVenue?:string;onVenueClick?:(code:string)=>void}){
  const mapEl=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<any>(null);
  const layerRef=useRef<any>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [count,setCount]=useState(0);
  const [pending,setPending]=useState(0);

  useEffect(()=>{
    let cancelled=false;
    let timer:any=null;

    const load=async()=>{
      try{
        setError("");
        const res=await fetch(`/api/venue-map?t=${Date.now()}`,{cache:"no-store"});
        const body=await res.json().catch(()=>({}));
        if(!res.ok)throw new Error(body?.error||"Map data failed");
        const points=(body?.venues||[]) as Point[];
        const left=Number(body?.pending||0);
        if(cancelled)return;
        setCount(points.length);
        setPending(left);

        const L=(await import("leaflet")).default;
        await import("leaflet.markercluster");
        if(cancelled||!mapEl.current)return;

        if(!mapRef.current){
          const map=L.map(mapEl.current,{
            zoomControl:true,
            attributionControl:true,
            scrollWheelZoom:true,
            minZoom:6
          }).setView([50.0755,14.4378],11);

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
            maxZoom:19,
            attribution:'&copy; OpenStreetMap contributors'
          }).addTo(map);

          const FitControl=(L.Control as any).extend({
            options:{position:"bottomright"},
            onAdd:()=>{
              const btn=L.DomUtil.create("button","venueMapLocate");
              btn.type="button";
              btn.title=lang==="cs"?"Zobrazit všechna hřiště":"Show all venues";
              btn.innerHTML="⌖";
              L.DomEvent.disableClickPropagation(btn);
              L.DomEvent.on(btn,"click",()=>fitAll());
              return btn;
            }
          });
          map.addControl(new FitControl());
          mapRef.current=map;
          setTimeout(()=>map.invalidateSize(),120);
        }

        renderPoints(points,L);
        setLoading(left>0);

        if(left>0 && !cancelled){
          timer=setTimeout(load,1000);
        }else{
          setLoading(false);
        }
      }catch(e:any){
        if(!cancelled){
          setError(e?.message||"Map failed");
          setLoading(false);
        }
      }
    };

    const renderPoints=(points:Point[],L:any)=>{
      const map=mapRef.current;
      if(!map)return;
      if(layerRef.current){
        try{map.removeLayer(layerRef.current);}catch{}
      }

      const clusters=(L as any).markerClusterGroup({
        showCoverageOnHover:false,
        spiderfyOnMaxZoom:true,
        maxClusterRadius:48,
        iconCreateFunction:(cluster:any)=>{
          const c=cluster.getChildCount();
          const size=c<10?34:c<50?40:48;
          return L.divIcon({
            html:`<div>${c}</div>`,
            className:"venueCluster",
            iconSize:[size,size]
          });
        }
      });

      const bounds=L.latLngBounds([]);
      for(const p of points){
        const isNext=p.code===nextVenue || p.nextMatch;
        const icon=L.divIcon({
          className:"venuePinWrap",
          html:`<div class="venuePin ${isNext?"next":""}"><span>${isNext?"⚽":"●"}</span></div>`,
          iconSize:[34,42],
          iconAnchor:[17,40],
          popupAnchor:[0,-35]
        });
        const marker=L.marker([p.latitude,p.longitude],{icon});
        marker.bindPopup(`
          <div class="venuePopup">
            <div class="venuePopupCode">${p.code}${isNext?` · ${lang==="cs"?"NEJBLIŽŠÍ ZÁPAS":"NEXT MATCH"}`:""}</div>
            <strong>${escapeHtml(p.name||p.code)}</strong>
            <span>${escapeHtml(p.address||"")}</span>
            ${p.matches?`<small>${lang==="cs"?"Odehráno / naplánováno":"Played / scheduled"}: ${p.matches}</small>`:""}
            <button data-venue="${escapeHtml(p.code)}">${lang==="cs"?"Detail hřiště":"Venue details"}</button>
          </div>
        `);
        marker.on("popupopen",()=>{
          const el=document.querySelector(`.venuePopup button[data-venue="${cssEscape(p.code)}"]`) as HTMLButtonElement|null;
          if(el)el.onclick=()=>onVenueClick?.(p.code);
        });
        clusters.addLayer(marker);
        bounds.extend([p.latitude,p.longitude]);
      }
      map.addLayer(clusters);
      layerRef.current=clusters;

      if(points.length===1)map.setView([points[0].latitude,points[0].longitude],15);
      else if(points.length>1)map.fitBounds(bounds.pad(.14),{maxZoom:13});
      else map.setView([50.0755,14.4378],11);

      (map as any).__venueBounds=bounds;
      (map as any).__venueCount=points.length;
    };

    const fitAll=()=>{
      const map=mapRef.current;
      if(!map)return;
      const bounds=(map as any).__venueBounds;
      const c=(map as any).__venueCount||0;
      if(c>1&&bounds?.isValid?.())map.fitBounds(bounds.pad(.14),{maxZoom:13});
      else if(c===1&&bounds?.isValid?.())map.fitBounds(bounds,{maxZoom:15});
      else map.setView([50.0755,14.4378],11);
    };

    void load();
    return()=>{
      cancelled=true;
      if(timer)clearTimeout(timer);
      if(mapRef.current){try{mapRef.current.remove();}catch{} mapRef.current=null;}
    };
  },[lang,nextVenue,onVenueClick]);

  return <div className="venueMapShell">
    <div className="venueMapMeta">
      <div><b>{lang==="cs"?"Mapa hřišť":"Venue map"}</b><span>{count} {lang==="cs"?"hřišť":"venues"}</span></div>
      {loading&&<span className="venueMapLoading">
        {lang==="cs"
          ? `Doplňuji polohy…${pending>0?` (${pending} zbývá)`:''}`
          : `Locating venues…${pending>0?` (${pending} remaining)`:''}`}
      </span>}
    </div>
    {error&&<div className="venueMapError"><span>{error}</span><button type="button" onClick={()=>window.location.reload()}>{lang==="cs"?"Zkusit znovu":"Retry"}</button></div>}
    <div ref={mapEl} className="venueMapCanvas"/>
  </div>;
}

function escapeHtml(value:string){
  return String(value||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]||c));
}
function cssEscape(value:string){
  if(typeof CSS!=="undefined"&&CSS.escape)return CSS.escape(value);
  return value.replace(/["\\]/g,"\\$&");
}
