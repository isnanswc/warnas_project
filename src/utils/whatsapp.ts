import type { CustomerOrder } from '../types';

export function formatCateringVendorOrder(
  cateringName: string,
  orders: CustomerOrder[],
  dateStr: string
): string {
  // Aggregate items across all customer orders
  const itemMap = new Map<string, { qty: number; notes: string[] }>();

  for (const ord of orders) {
    for (const it of ord.items) {
      const existing = itemMap.get(it.menuName) || { qty: 0, notes: [] };
      existing.qty += it.qty;
      if (it.notes && it.notes.trim()) {
        existing.notes.push(`${ord.customerName}: ${it.notes.trim()}`);
      }
      itemMap.set(it.menuName, existing);
    }
  }

  let text = `*PESANAN KATERING - ${dateStr.toUpperCase()}*\n`;
  text += `Kepada: ${cateringName}\n`;
  text += `-------------------------------------------\n`;
  text += `*REKAP TOTAL MENU:*\n`;

  let idx = 1;
  for (const [name, data] of itemMap.entries()) {
    text += `${idx++}. *${name}* : ${data.qty} porsi\n`;
  }

  // Add notes section if any
  const allNotes: string[] = [];
  for (const [name, data] of itemMap.entries()) {
    if (data.notes.length > 0) {
      allNotes.push(`- *${name}* -> ${data.notes.join('; ')}`);
    }
  }

  if (allNotes.length > 0) {
    text += `\n*CATATAN KHUSUS:*\n`;
    text += allNotes.join('\n') + '\n';
  }

  text += `-------------------------------------------\n`;
  text += `Total Pesanan: ${orders.length} orang\n`;
  text += `Mohon konfirmasi dan info jam pengiriman ya. Terima kasih! 🙏`;

  return text;
}

export function formatCustomerInvoice(
  order: CustomerOrder,
  merchantName: string = 'Koordinator Katering'
): string {
  let text = `Halo kak *${order.customerName}*,\n`;
  text += `Berikut rincian pesanan katering hari ini:\n`;
  text += `-------------------------------------------\n`;

  for (const item of order.items) {
    text += `• ${item.menuName} x${item.qty} = Rp ${item.subtotal.toLocaleString('id-ID')}\n`;
    if (item.notes) {
      text += `  _(Catatan: ${item.notes})_\n`;
    }
  }

  text += `-------------------------------------------\n`;
  text += `*TOTAL BAYAR: Rp ${order.totalAmount.toLocaleString('id-ID')}*\n`;
  text += `Status: ${order.isPaid ? '✅ LUNAS' : '⏳ BELUM DIBAYAR'}\n\n`;

  if (!order.isPaid) {
    text += `Pembayaran bisa scan QRIS penjual atau transfer ya kak.\n`;
    text += `Terima kasih! 😊`;
  } else {
    text += `Terima kasih sudah melakukan pembayaran! 🙏`;
  }

  return text;
}

export function createWhatsAppUrl(phone: string, text: string): string {
  // Normalize indonesian phone number (08xxx -> 628xxx)
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}
