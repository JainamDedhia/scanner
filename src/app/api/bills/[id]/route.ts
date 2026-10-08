import { NextResponse } from 'next/server';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(id);
    if (!bill) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(id);
    return NextResponse.json({ bill, items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await req.json();
    const { bill, items } = data;

    const updateBill = db.prepare(`
      UPDATE bills SET
        buyer_name = ?, broker_name = ?, merchant_name = ?, bill_number = ?, bill_date = ?,
        total_size = ?, total_weight = ?, total_amount = ?, confidence_notes = ?,
        status = ?
      WHERE id = ?
    `);

    const insertItem = db.prepare(`
      INSERT INTO bill_items (
        bill_id, product_name, bags, weight, unit_price, line_price, location
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const deleteItems = db.prepare(`DELETE FROM bill_items WHERE bill_id = ?`);

    const transaction = db.transaction(() => {
      updateBill.run(
        bill.buyer_name, bill.broker_name, bill.merchant_name, bill.bill_number, bill.bill_date,
        bill.total_size, bill.total_weight, bill.total_amount, bill.confidence_notes,
        bill.status, id
      );
      
      deleteItems.run(id);
      if (items && Array.isArray(items)) {
        for (const item of items) {
          insertItem.run(
            id, item.product_name, item.bags, item.weight,
            item.unit_price, item.line_price, item.location
          );
        }
      }
    });

    transaction();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const bill = db.prepare('SELECT image_path FROM bills WHERE id = ?').get(id) as any;
    if (bill && bill.image_path) {
      try {
        fs.unlinkSync(path.join(process.cwd(), bill.image_path));
      } catch (e) {
        console.error('Failed to delete image', e);
      }
    }
    db.prepare('DELETE FROM bills WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
