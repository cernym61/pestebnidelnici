import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { SEASON, SOURCE_URL } from '@/lib/data';

export const dynamic='force-dynamic';

const fallback={
  current_season:SEASON,
  current_url:SOURCE_URL,
  current_year:2026,
  current_phase:'podzim',
  current_division:'5D',
  status:'active',
  waiting_for_season:null,
  waiting_for_label:null,
  last_checked_at:null
};

export async function GET(){
  try{
    const admin=getSupabaseAdmin();
    const {data,error}=await admin.from('season_state').select('*').eq('id',1).maybeSingle();
    if(error)throw error;
    const s=data||fallback;
    return NextResponse.json({
      currentSeason:s.current_season,
      currentUrl:s.current_url,
      currentYear:s.current_year,
      currentPhase:s.current_phase,
      currentDivision:s.current_division,
      status:s.status,
      waitingForSeason:s.waiting_for_season,
      waitingForLabel:s.waiting_for_label,
      lastCheckedAt:s.last_checked_at
    },{headers:{'Cache-Control':'no-store'}});
  }catch{
    return NextResponse.json({
      currentSeason:fallback.current_season,currentUrl:fallback.current_url,
      currentYear:fallback.current_year,currentPhase:fallback.current_phase,
      currentDivision:fallback.current_division,status:fallback.status,
      waitingForSeason:null,waitingForLabel:null,lastCheckedAt:null
    },{headers:{'Cache-Control':'no-store'}});
  }
}
