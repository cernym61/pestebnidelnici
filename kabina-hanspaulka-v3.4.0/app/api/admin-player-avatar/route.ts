import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime='nodejs';

async function requireAdmin(req:NextRequest){
  const auth=req.headers.get('authorization')||'';
  const token=auth.startsWith('Bearer ')?auth.slice(7):'';
  if(!token)throw new Error('Unauthorized');
  const admin=getSupabaseAdmin();
  const {data:userData,error:userError}=await admin.auth.getUser(token);
  if(userError||!userData.user)throw new Error('Unauthorized');
  const {data:profile}=await admin.from('players').select('role,active').eq('user_id',userData.user.id).maybeSingle();
  if(!profile||profile.role!=='admin'||profile.active!==true)throw new Error('Admin access required');
  return admin;
}

export async function POST(req:NextRequest){
  try{
    const admin=await requireAdmin(req);
    const fd=await req.formData();
    const playerId=String(fd.get('playerId')||'');
    const file=fd.get('file');
    if(!playerId||!(file instanceof File))return NextResponse.json({error:'Missing player or file'},{status:400});
    if(file.size>5*1024*1024)return NextResponse.json({error:'Max. 5 MB'},{status:400});
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))return NextResponse.json({error:'Unsupported image type'},{status:400});
    const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
    const path=`admin/${playerId}/avatar-${Date.now()}.${ext}`;
    const {error:uploadError}=await admin.storage.from('player-avatars').upload(path,await file.arrayBuffer(),{contentType:file.type,upsert:true});
    if(uploadError)throw uploadError;
    const {data}=admin.storage.from('player-avatars').getPublicUrl(path);
    const url=`${data.publicUrl}?v=${Date.now()}`;
    const {error:updateError}=await admin.from('players').update({avatar_url:url}).eq('id',playerId);
    if(updateError)throw updateError;
    return NextResponse.json({ok:true,url});
  }catch(e:any){return NextResponse.json({error:e?.message||'Avatar update failed'},{status:403});}
}

export async function DELETE(req:NextRequest){
  try{
    const admin=await requireAdmin(req);
    const body=await req.json().catch(()=>({}));
    const playerId=String(body?.playerId||'');
    if(!playerId)return NextResponse.json({error:'Missing player'},{status:400});
    const {error}=await admin.from('players').update({avatar_url:null}).eq('id',playerId);
    if(error)throw error;
    return NextResponse.json({ok:true});
  }catch(e:any){return NextResponse.json({error:e?.message||'Avatar removal failed'},{status:403});}
}
