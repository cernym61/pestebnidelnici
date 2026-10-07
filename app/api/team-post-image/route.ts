import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime='nodejs';
export const maxDuration=30;

export async function POST(request:Request){
  try{
    const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/,'');
    if(!token)return NextResponse.json({error:'Missing session'},{status:401});
    const admin=getSupabaseAdmin();
    const {data,error}=await admin.auth.getUser(token);
    if(error||!data.user)return NextResponse.json({error:'Invalid session'},{status:401});
    const {data:player}=await admin.from('players').select('id,active').eq('user_id',data.user.id).maybeSingle();
    if(!player||player.active!==true)return NextResponse.json({error:'Active player required'},{status:403});

    const form=await request.formData();
    const file=form.get('file');
    if(!(file instanceof File))return NextResponse.json({error:'Missing file'},{status:400});
    if(file.size>7*1024*1024)return NextResponse.json({error:'Max 7 MB'},{status:400});
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))return NextResponse.json({error:'JPG, PNG or WEBP only'},{status:400});

    const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
    const path=`${player.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const bytes=new Uint8Array(await file.arrayBuffer());
    const {error:upErr}=await admin.storage.from('board-images').upload(path,bytes,{contentType:file.type,upsert:false,cacheControl:'3600'});
    if(upErr)throw upErr;
    const {data:url}=admin.storage.from('board-images').getPublicUrl(path);
    return NextResponse.json({ok:true,url:url.publicUrl});
  }catch(e:any){
    return NextResponse.json({error:e?.message||'Image upload failed'},{status:500});
  }
}
