const APP_ID=process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '';
const RAW_REST_KEY=process.env.ONESIGNAL_REST_API_KEY || process.env.ONESIGNAL_API_KEY || '';
const REST_KEY=RAW_REST_KEY.trim().replace(/^['\"]|['\"]$/g,'').replace(/^(Key|Bearer)\s+/i,'').trim();
const SITE_URL='https://www.pestebnidelnici.cz';

export type PushInput={
  externalIds:string[];
  titleCs:string;
  bodyCs:string;
  titleEn?:string;
  bodyEn?:string;
  url?:string;
};

export async function sendPush(input:PushInput){
  if(!APP_ID || !REST_KEY) throw new Error('OneSignal is not configured');
  if(!REST_KEY.startsWith('os_v2_app_')) throw new Error(`OneSignal API key looks invalid (expected prefix os_v2_app_; got ${REST_KEY.slice(0,8) || 'empty'}...)`);
  if(!input.externalIds.length) return {id:null,recipients:0};
  const response=await fetch('https://api.onesignal.com/notifications',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Key ${REST_KEY}`},
    body:JSON.stringify({
      app_id:APP_ID,
      target_channel:'push',
      include_aliases:{external_id:input.externalIds},
      headings:{cs:input.titleCs,en:input.titleEn||input.titleCs},
      contents:{cs:input.bodyCs,en:input.bodyEn||input.bodyCs},
      url:input.url || SITE_URL,
      web_url:input.url || SITE_URL,
      chrome_web_icon:`${SITE_URL}/icon-192.png`,
      firefox_icon:`${SITE_URL}/icon-192.png`
    })
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const detail=Array.isArray(data?.errors)?data.errors.join(', '):(data?.errors||data?.message||'OneSignal send failed');
    throw new Error(`${detail} [key:${REST_KEY.slice(0,10)}… len:${REST_KEY.length}; app:${APP_ID.slice(0,8)}…]`);
  }
  return data;
}
