import Dexie, { Table } from 'dexie';
import type { MenuItem, CustomerOrder, AppSettings } from '../types';

export class CateringDatabase extends Dexie {
  menus!: Table<MenuItem, number>;
  orders!: Table<CustomerOrder, number>;
  settings!: Table<AppSettings, number>;

  constructor() {
    super('CateringOrderDB');
    this.version(1).stores({
      menus: '++id, name, category, isActive',
      orders: '++id, sessionId, customerName, isPaid, createdAt',
      settings: '++id'
    });
  }
}

export const db = new CateringDatabase();

// Seed initial default menu & settings if database is empty
export async function seedInitialData() {
  const menuCount = await db.menus.count();
  if (menuCount === 0) {
    await db.menus.bulkAdd([
      { name: 'Nasi Rames Ayam Goreng', category: 'Makanan', costPrice: 16000, sellingPrice: 18000, isActive: true },
      { name: 'Nasi Rames Rendang Sapi', category: 'Makanan', costPrice: 20000, sellingPrice: 23000, isActive: true },
      { name: 'Nasi Bakar Tongkol Suwir', category: 'Makanan', costPrice: 15000, sellingPrice: 17000, isActive: true },
      { name: 'Nasi Kuning Komplit', category: 'Makanan', costPrice: 15000, sellingPrice: 17000, isActive: true },
      { name: 'Gado-Gado Lontong', category: 'Makanan', costPrice: 13000, sellingPrice: 15000, isActive: true },
      { name: 'Es Teh Manis', category: 'Minuman', costPrice: 3000, sellingPrice: 4000, isActive: true },
      { name: 'Es Jeruk Peras', category: 'Minuman', costPrice: 5000, sellingPrice: 7000, isActive: true },
      { name: 'Air Mineral 600ml', category: 'Minuman', costPrice: 3000, sellingPrice: 4000, isActive: true },
      { name: 'Kerupuk Kaleng', category: 'Tambahan', costPrice: 1000, sellingPrice: 2000, isActive: true },
      { name: 'Gorengan Bakwan/Tempe', category: 'Tambahan', costPrice: 1500, sellingPrice: 2000, isActive: true },
    ]);
  }

  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({
      cateringName: 'Katering Berkah Rasa',
      cateringPhone: '6281234567890',
      merchantName: 'WARNAS KOORDINATOR',
    });
  }
}
