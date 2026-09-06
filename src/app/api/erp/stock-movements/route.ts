// FMCore ERP — Stock Movements API
// GET  /api/erp/stock-movements          → list all movements (optional ?woRecordId= or ?movementType=)
// POST /api/erp/stock-movements          → create a new stock movement (issue material to WO, return, adjust)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/erp/auth';

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const woRecordId = url.searchParams.get('woRecordId');
  const movementType = url.searchParams.get('movementType');
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const pageSize = Math.min(200, Math.max(5, parseInt(url.searchParams.get('pageSize') || '25')));

  const where: any = {};
  if (woRecordId) where.woRecordId = woRecordId;
  if (movementType) where.movementType = movementType;

  const total = await db.stockMovement.count({ where });
  const rows = await db.stockMovement.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: pageSize,
    skip: (page - 1) * pageSize,
  });

  return NextResponse.json({
    data: rows.map((m) => ({
      id: m.id,
      itemDescription: m.itemDescription,
      movementType: m.movementType,
      quantity: m.quantity,
      woRegisterId: m.woRegisterId,
      woRecordId: m.woRecordId,
      woSequence: m.woSequence,
      invRegisterId: m.invRegisterId,
      invRecordId: m.invRecordId,
      movedBy: m.movedBy,
      note: m.note,
      createdAt: m.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser(req);

  const body = await req.json();
  const { itemDescription, movementType, quantity, woRegisterId, woRecordId, woSequence, invRegisterId, invRecordId, note } = body;

  if (!itemDescription || !movementType || quantity === undefined) {
    return NextResponse.json({ ok: false, error: 'itemDescription, movementType, and quantity are required' }, { status: 400 });
  }

  // Create the stock movement record
  const movement = await db.stockMovement.create({
    data: {
      itemDescription,
      movementType,
      quantity: Number(quantity),
      woRegisterId: woRegisterId || null,
      woRecordId: woRecordId || null,
      woSequence: woSequence || null,
      invRegisterId: invRegisterId || null,
      invRecordId: invRecordId || null,
      movedBy: currentUser?.username || 'system',
      note: note || null,
    },
  });

  // If linked to an inventory record, update the Qty In Stock
  if (invRegisterId && invRecordId) {
    const invRecord = await db.record.findUnique({ where: { id: invRecordId, registerId: invRegisterId } });
    if (invRecord) {
      const invData = JSON.parse(invRecord.data);
      const currentQty = Number(invData['Qty In Stock']) || 0;
      if (movementType === 'issue_to_wo' || movementType === 'adjustment_out') {
        invData['Qty In Stock'] = Math.max(0, currentQty - Number(quantity));
        // Update status if below min
        const minLevel = Number(invData['Min Level']) || 0;
        if (invData['Qty In Stock'] <= minLevel) {
          invData['Status'] = invData['Qty In Stock'] === 0 ? 'Out of Stock' : 'Low Stock';
        }
      } else if (movementType === 'return_to_stock' || movementType === 'adjustment_in') {
        invData['Qty In Stock'] = currentQty + Number(quantity);
        const maxLevel = Number(invData['Max Level']) || 999999;
        if (invData['Qty In Stock'] > minLevel && invData['Qty In Stock'] <= maxLevel) {
          invData['Status'] = 'In Stock';
        }
      }
      await db.record.update({
        where: { id: invRecordId },
        data: { data: JSON.stringify(invData), updatedBy: currentUser?.username || 'system' },
      });
    }
  }

  // Create audit log entry
  const summary = movementType === 'issue_to_wo'
    ? `Issued ${quantity} × "${itemDescription}" to WO #${woSequence || '?'}`
    : movementType === 'return_to_stock'
    ? `Returned ${quantity} × "${itemDescription}" to stock from WO #${woSequence || '?'}`
    : movementType === 'adjustment_in'
    ? `Stock adjustment IN: ${quantity} × "${itemDescription}"`
    : movementType === 'adjustment_out'
    ? `Stock adjustment OUT: ${quantity} × "${itemDescription}"`
    : `Stock movement: ${quantity} × "${itemDescription}" (${movementType})`;

  await db.auditLog.create({
    data: {
      userId: currentUser?.id || null,
      action: movementType === 'issue_to_wo' ? 'Updated' : 'Created',
      module: 'Stock Movements',
      summary,
      newValue: JSON.stringify({ itemDescription, movementType, quantity, woSequence }),
    },
  });

  // Create notification if stock is low after movement
  if (movementType === 'issue_to_wo' && invRegisterId && invRecordId) {
    const invRecord = await db.record.findUnique({ where: { id: invRecordId } });
    if (invRecord) {
      const invData = JSON.parse(invRecord.data);
      if (invData['Status'] === 'Low Stock' || invData['Status'] === 'Out of Stock') {
        await db.notification.create({
          data: {
            type: 'low_stock',
            title: 'Low Stock Alert',
            message: `${invData['Description'] || itemDescription} is now ${invData['Status']} (${invData['Qty In Stock']} remaining) after issuing to WO #${woSequence}`,
            severity: invData['Status'] === 'Out of Stock' ? 'critical' : 'warning',
            link: '/?tab=inventory',
          },
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    id: movement.id,
    itemDescription: movement.itemDescription,
    movementType: movement.movementType,
    quantity: movement.quantity,
    woSequence: movement.woSequence,
    movedBy: movement.movedBy,
    createdAt: movement.createdAt.toISOString(),
    summary,
  });
}
