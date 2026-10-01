import QRCode from 'qrcode';

// Convert File to Base64 Data URL
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Generate QR Code data URL from text (e.g. payment link or QRIS payload)
export async function generateQrCodeDataUrl(content: string): Promise<string> {
  try {
    return await QRCode.toDataURL(content, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR code', err);
    return '';
  }
}

// Convert Static EMVCo QRIS to Dynamic QRIS with exact amount
// EMVCo tag 54 = Transaction Amount (Tag: 54, Length: 2 digits, Value: amount)
// Tag 01 = Point of Initiation (010211 for static, 010212 for dynamic)
// Tag 58 = Country Code (5802ID)
// Tag 63 = CRC-16 (6304XXXX)
export function convertStaticQrisToDynamic(qrisPayload: string, amount: number): string {
  if (!qrisPayload || amount <= 0) return qrisPayload;

  try {
    let qris = qrisPayload.trim();
    // Check if valid QRIS string
    if (!qris.startsWith('000201')) {
      return qrisPayload;
    }

    // Convert tag 01 (Point of Initiation) to 12 (Dynamic)
    qris = qris.replace('010211', '010212');

    // Remove old CRC tag 6304... if present at the end
    if (qris.includes('6304')) {
      const crcIndex = qris.lastIndexOf('6304');
      qris = qris.substring(0, crcIndex);
    }

    // Format amount tag (Tag 54)
    const amountStr = amount.toString();
    const amountLen = amountStr.length.toString().padStart(2, '0');
    const tag54 = `54${amountLen}${amountStr}`;

    // Tag 58 (Country code) is usually right after 53 (Currency) or 54
    // If tag 54 already exists, replace it, otherwise insert before 5802ID
    if (qris.includes('54')) {
      qris = qris.replace(/54\d{2}\d+/, tag54);
    } else {
      qris = qris.replace('5802ID', `${tag54}5802ID`);
    }

    // Append CRC placeholder
    qris += '6304';

    // Calculate CRC16 CCITT
    const crc = crc16Ccitt(qris);
    return qris + crc;
  } catch {
    return qrisPayload;
  }
}

function crc16Ccitt(str: string): string {
  let crc = 0xffff;
  const strlen = str.length;
  for (let c = 0; c < strlen; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
