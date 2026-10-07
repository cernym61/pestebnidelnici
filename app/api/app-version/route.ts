import { NextResponse } from 'next/server';

export const dynamic='force-dynamic';

export async function GET(){
  return NextResponse.json(
    {version:'3.8.0'},
    {headers:{
      'Cache-Control':'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma':'no-cache',
      'Expires':'0'
    }}
  );
}
