import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const all = searchParams.get('all');
    
    let query = 'SELECT * FROM bills';
    let params: any[] = [];
    
    if (all) {
      // all
    } else if (start && end) {
      query += ' WHERE date(created_at) >= ? AND date(created_at) <= ?';
      params.push(start, end);
    } else if (date) {
      query += ' WHERE date(created_at) = ? OR date(bill_date) = ?';
      params.push(date, date);
    }
    
    const bills = db.prepare(query).all(...params) as any[];
    
    const billIds = bills.map(b => b.id);
    let items: any[] = [];
    
    if (billIds.length > 0) {
      const placeholders = billIds.map(() => '?').join(',');
      items = db.prepare(`SELECT * FROM bill_items WHERE bill_id IN (${placeholders})`).all(...billIds) as any[];
    }

    return NextResponse.json({ bills, items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
