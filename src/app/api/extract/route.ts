import { NextResponse } from 'next/server';
import { extractBillData } from '@/lib/gemini';
import db from '@/lib/db';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const isRetry = formData.get('billId'); // Optional, if retrying an existing failed bill

    if (!file && !isRetry) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    let filePath = '';
    let mimeType = '';
    let base64Data = '';
    let existingBillId = isRetry ? parseInt(isRetry as string, 10) : null;

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileExt = path.extname(file.name) || '.jpg';
      const fileName = `${crypto.randomUUID()}${fileExt}`;
      filePath = path.join('uploads', fileName);
      fs.writeFileSync(path.join(process.cwd(), filePath), buffer);

      mimeType = file.type;
      base64Data = buffer.toString('base64');
    } else if (existingBillId) {
      const existing = db.prepare('SELECT image_path FROM bills WHERE id = ?').get(existingBillId) as any;
      if (!existing) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
      
      filePath = existing.image_path;
      const absolutePath = path.join(process.cwd(), filePath);
      const buffer = fs.readFileSync(absolutePath);
      mimeType = 'image/jpeg'; // Fallback
      if (filePath.endsWith('.png')) mimeType = 'image/png';
      if (filePath.endsWith('.webp')) mimeType = 'image/webp';
      base64Data = buffer.toString('base64');
    }

    let data: any;
    let status = 'OK';
    let failedReason = '';

    try {
      data = await extractBillData(mimeType, base64Data);
    } catch (err: any) {
      // Retry once
      try {
        console.log('Extraction failed, retrying once...', err);
        data = await extractBillData(mimeType, base64Data);
      } catch (retryErr: any) {
        status = 'failed';
        failedReason = retryErr.message || 'Unknown error';
      }
    }

    if (status === 'OK' && data) {
      // Validation for needs_review
      const hasMerchant = !!data.merchant_name;
      const hasTotal = data.total_amount !== null && data.total_amount !== undefined;
      const hasItems = data.items && data.items.length > 0;

      let sumOfLines = 0;
      if (hasItems) {
        sumOfLines = data.items.reduce((sum: number, item: any) => sum + (Number(item.line_price) || 0), 0);
      }

      let differs = false;
      if (hasTotal && hasItems && sumOfLines > 0) {
        const diff = Math.abs(sumOfLines - Number(data.total_amount));
        if (diff / Number(data.total_amount) > 0.01) {
          differs = true;
        }
      }

      if (!hasMerchant || !hasTotal || !hasItems || differs) {
        status = 'needs_review';
      }
    }

    const insertBill = db.prepare(`
      INSERT INTO bills (
        buyer_name, broker_name, merchant_name, bill_number, bill_date,
        total_size, total_weight, total_amount, confidence_notes,
        image_path, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

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

    let finalBillId = existingBillId;

    const transaction = db.transaction(() => {
      if (existingBillId) {
        updateBill.run(
          data?.buyer_name || null, data?.broker_name || null, data?.merchant_name || null, data?.bill_number || null, data?.bill_date || null,
          data?.total_size || null, data?.total_weight || null, data?.total_amount || null, data?.confidence_notes || failedReason || null,
          status, existingBillId
        );
        deleteItems.run(existingBillId);
      } else {
        const res = insertBill.run(
          data?.buyer_name || null, data?.broker_name || null, data?.merchant_name || null, data?.bill_number || null, data?.bill_date || null,
          data?.total_size || null, data?.total_weight || null, data?.total_amount || null, data?.confidence_notes || failedReason || null,
          filePath, status
        );
        finalBillId = res.lastInsertRowid as number;
      }

      if (data?.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          insertItem.run(
            finalBillId,
            item.product_name || null,
            item.bags || null,
            item.weight || null,
            item.unit_price || null,
            item.line_price || null,
            item.location || null
          );
        }
      }
    });

    transaction();

    return NextResponse.json({ id: finalBillId, status, data });
  } catch (error: any) {
    console.error('API /extract error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
