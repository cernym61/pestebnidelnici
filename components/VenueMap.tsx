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
  const clusterRef=useRef<any>(null);
  const leafletRef=useRef<any>(null);
  const markerCodesRef=useRef<Set<string>>(new Set());
  const boundsRef=useRef<any>(null);
  const userInteractedRef=useRef(false);
  const didInitialFitRef=useRef(false);
  const clickRef=useRef(onVenueClick);
  const langRef=useRef(lang);
  const nextVenueRef=useRef(nextVenue);

  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [count,setCount]=useState(0);
  const [pending,setPending]=useState(0);

  useEffect(()=>{clickRef.current=onVenueClick;},[onVenueClick]);
  useEffect(()=>{langRef.current=lang;},[lang]);
  useEffect(()=>{nextVenueRef.current=nextVenue;},[nextVenue]);

  useEffect(()=>{
    let cancelled=false;
    let timer:any=null;

    const initMap=async()=>{
      if(mapRef.current||!mapEl.current)return;
      const L=(await import("leaflet")).default;
      await import("leaflet.markercluster");
      if(cancelled||!mapEl.current)return;

      leafletRef.current=L;
      boundsRef.current=L.latLngBounds([]);

      const map=L.map(mapEl.current,{
        zoomControl:true,
        attributionControl:true,
        scrollWheelZoom:true,
        dragging:true,
        touchZoom:true,
        doubleClickZoom:true,
        boxZoom:true,
        keyboard:true,
        minZoom:6
      }).setView([50.0755,14.4378],11);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
        maxZoom:19,
        attribution:'&copy; OpenStreetMap contributors'
      }).addTo(map);

      const clusters=(L as any).markerClusterGroup({
        showCoverageOnHover:false,
        spiderfyOnMaxZoom:true,
        maxClusterRadius:48,
        removeOutsideVisibleBounds:true,
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
      map.addLayer(clusters);

      // Once the user moves/zooms, never auto-fit the map again.
      map.on("dragstart zoomstart",()=>{userInteractedRef.current=true;});

      const FitControl=(L.Control as any).extend({
        options:{position:"bottomright"},
        onAdd:()=>{
          const btn=L.DomUtil.create("button","venueMapLocate");
          btn.type="button";
          btn.title=langRef.current==="cs"?"Zobrazit všechna hřiště":"Show all venues";
          btn.innerHTML="⌖";
          L.DomEvent.disableClickPropagation(btn);
          L.DomEvent.disableScrollPropagation(btn);
          L.DomEvent.on(btn,"click",()=>{
            const b=boundsRef.current;
            if(b?.isValid?.()){
              userInteractedRef.current=false;
              map.fitBounds(b.pad(.14),{maxZoom:13});
              setTimeout(()=>{userInteractedRef.current=true;},250);
            }else{
              map.setView([50.0755,14.4378],11);
            }
          });
          return btn;
        }
      });
      map.addControl(new FitControl());

      mapRef.current=map;
      clusterRef.current=clusters;
      setTimeout(()=>map.invalidateSize(),120);
    };

    const addPoints=(points:Point[])=>{
      const L=leafletRef.current;
      const map=mapRef.current;
      const clusters=clusterRef.current;
      const bounds=boundsRef.current;
      if(!L||!map||!clusters||!bounds)return;

      let added=0;
      for(const p of points){
        if(markerCodesRef.current.has(p.code))continue;

        const isNext=p.code===nextVenueRef.current || p.nextMatch;
        const icon=L.divIcon({
          className:"venuePinWrap",
          html:`<div class="venuePin ${isNext?"next":""}"><span>${isNext?"⚽":"●"}</span></div>`,
          iconSize:[34,42],
          iconAnchor:[17,40],
          popupAnchor:[0,-35]
        });

        const marker=L.marker([p.latitude,p.longitude],{
          icon,
          riseOnHover:true,
          keyboard:true
        });

        marker.bindPopup(`
          <div class="venuePopup">
            <div class="venuePopupCode">${escapeHtml(p.code)}${isNext?` · ${langRef.current==="cs"?"NEJBLIŽŠÍ ZÁPAS":"NEXT MATCH"}`:""}</div>
            <strong>${escapeHtml(p.name||p.code)}</strong>
            <span>${escapeHtml(p.address||"")}</span>
            ${p.matches?`<small>${langRef.current==="cs"?"Odehráno / naplánováno":"Played / scheduled"}: ${p.matches}</small>`:""}
            <button type="button" data-venue="${escapeHtml(p.code)}">${langRef.current==="cs"?"Detail hřiště":"Venue details"}</button>
          </div>
        `,{
          autoClose:false,
          closeOnClick:false,
          closeButton:true
        });

        marker.on("popupopen",(ev:any)=>{
          const popupEl=ev?.popup?.getElement?.() as HTMLElement|null;
          const btn=popupEl?.querySelector("button[data-venue]") as HTMLButtonElement|null;
          if(btn)btn.onclick=()=>clickRef.current?.(p.code);
        });

        clusters.addLayer(marker);
        markerCodesRef.current.add(p.code);
        bounds.extend([p.latitude,p.longitude]);
        added++;
      }

      // Only auto-fit the very first successful set of markers.
      // Subsequent geocoding batches never move a map the user is already using.
      if(added>0&&!didInitialFitRef.current&&!userInteractedRef.current){
        didInitialFitRef.current=true;
        if(markerCodesRef.current.size===1){
          map.fitBounds(bounds,{maxZoom:15});
        }else{
          map.fitBounds(bounds.pad(.14),{maxZoom:13});
        }
      }
    };

    const load=async()=>{
      try{
        setError("");
        await initMap();
        const res=await fetch(`/api/venue-map?t=${Date.now()}`,{cache:"no-store"});
        const body=await res.json().catch(()=>({}));
        if(!res.ok)throw new Error(body?.error||"Map data failed");

        const points=(body?.venues||[]) as Point[];
        const left=Number(body?.pending||0);
        if(cancelled)return;

        setCount(points.length);
        setPending(left);
        addPoints(points);

        if(left>0){
          setLoading(true);
          timer=setTimeout(load,1100);
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

    void load();

    return()=>{
      cancelled=true;
      if(timer)clearTimeout(timer);
      if(mapRef.current){
        try{mapRef.current.remove();}catch{}
      }
      mapRef.current=null;
      clusterRef.current=null;
      leafletRef.current=null;
      markerCodesRef.current.clear();
      boundsRef.current=null;
      didInitialFitRef.current=false;
      userInteractedRef.current=false;
    };
  },[]);

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
