import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 1000;
    const date = searchParams.get('date');
    const all = searchParams.get('all');
    
    let query = 'SELECT * FROM bills';
    let params: any[] = [];
    
    if (date) {
      query += ' WHERE date(created_at) = ? OR date(bill_date) = ?';
      params.push(date, date);
    }
    
    query += ' ORDER BY created_at DESC';
    if (!all) {
      query += ' LIMIT ?';
      params.push(limit);
    }
    
    const bills = db.prepare(query).all(...params);
    return NextResponse.json({ bills });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
