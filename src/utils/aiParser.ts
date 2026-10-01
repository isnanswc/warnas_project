import Fuse from 'fuse.js';
import type { MenuItem, ParsedItemCandidate } from '../types';

export function parseOrderText(rawText: string, availableMenus: MenuItem[]): ParsedItemCandidate[] {
  if (!rawText.trim()) return [];

  const fuse = new Fuse(availableMenus, {
    keys: ['name'],
    threshold: 0.45,
    includeScore: true,
  });

  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const results: ParsedItemCandidate[] = [];

  for (const line of lines) {
    // Strip leading numbers/bullets like "1.", "1)", "-", "*", "•"
    const cleanedLine = line.replace(/^[\d]+[\.\)\-]?\s*/, '').replace(/^[\*\•\-\>]\s*/, '').trim();
    if (!cleanedLine) continue;

    // Pattern A: "Nama: Pesanan..." or "Nama - Pesanan..." or "Nama = Pesanan..."
    const delimiterMatch = cleanedLine.match(/^([^:\-=\t]+?)[:\-=\t](.+)$/);

    let customerName = '';
    let orderDetailText = '';

    if (delimiterMatch) {
      customerName = delimiterMatch[1].trim();
      orderDetailText = delimiterMatch[2].trim();
    } else {
      // Check if line is just "Budi pesan nasi rames..."
      const pesanMatch = cleanedLine.match(/^([a-zA-Z\s]{2,20})\s+(?:pesan|order|minta)\s+(.+)$/i);
      if (pesanMatch) {
        customerName = pesanMatch[1].trim();
        orderDetailText = pesanMatch[2].trim();
      } else {
        // Fallback: entire line could be "Nama Item Qty" or single person item
        // Let's check if the first 1-2 words look like a person's name
        const parts = cleanedLine.split(/\s+/);
        if (parts.length >= 2) {
          customerName = parts[0];
          orderDetailText = parts.slice(1).join(' ');
        } else {
          customerName = 'Umum / ' + cleanedLine;
          orderDetailText = cleanedLine;
        }
      }
    }

    // Now parse items from orderDetailText
    // Common item delimiters: comma ",", plus "+", "dan", "&"
    const rawItems = orderDetailText
      .split(/[,+&]|(?:\s+dan\s+)/i)
      .map(i => i.trim())
      .filter(i => i.length > 0);

    const parsedItems: ParsedItemCandidate['items'] = [];

    for (const rawItem of rawItems) {
      // Extract notes inside brackets e.g. "nasi ayam (sambel dipisah)"
      let notes = '';
      let cleanItem = rawItem;
      const notesMatch = cleanItem.match(/\((.*?)\)/);
      if (notesMatch) {
        notes = notesMatch[1].trim();
        cleanItem = cleanItem.replace(/\(.*?\)/, '').trim();
      }

      // Extract quantity: e.g. "2x", "x 2", "2 porsi", "2 bks", "2", at start or end
      let qty = 1;

      // Case: "2x nasi bakar" or "2 porsi nasi bakar"
      const leadingQtyMatch = cleanItem.match(/^(\d+)\s*(?:x|porsi|bks|cup|pcs|ptg)?\s+(.+)$/i);
      // Case: "nasi bakar 2x" or "nasi bakar 2"
      const trailingQtyMatch = cleanItem.match(/^(.+?)\s*(?:x\s*)?(\d+)\s*(?:x|porsi|bks|cup|pcs|ptg)?$/i);

      let itemNameQuery = cleanItem;

      if (leadingQtyMatch && !isNaN(parseInt(leadingQtyMatch[1]))) {
        qty = parseInt(leadingQtyMatch[1]);
        itemNameQuery = leadingQtyMatch[2].trim();
      } else if (trailingQtyMatch && !isNaN(parseInt(trailingQtyMatch[2]))) {
        qty = parseInt(trailingQtyMatch[2]);
        itemNameQuery = trailingQtyMatch[1].trim();
      }

      // Fuzzy match against available menu
      const matchResult = fuse.search(itemNameQuery);
      let matchedMenuItem: MenuItem | undefined = undefined;
      let unitPrice = 0;
      let finalMenuName = itemNameQuery;

      if (matchResult.length > 0 && matchResult[0].score !== undefined && matchResult[0].score <= 0.5) {
        matchedMenuItem = matchResult[0].item;
        finalMenuName = matchedMenuItem.name;
        unitPrice = matchedMenuItem.sellingPrice;
      }

      parsedItems.push({
        menuName: finalMenuName,
        qty: qty > 0 ? qty : 1,
        matchedMenuItem,
        unitPrice,
        notes: notes || undefined,
      });
    }

    if (parsedItems.length > 0) {
      results.push({
        customerName: capitalizeWords(customerName),
        rawText: line,
        items: parsedItems,
      });
    }
  }

  return results;
}

function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, l => l.toUpperCase());
}
