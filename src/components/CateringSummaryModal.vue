<script setup lang="ts">
import { computed } from 'vue';
import { 
  X, 
  Send, 
  Copy, 
  UtensilsCrossed, 
  MessageSquare, 
  Check, 
  AlertCircle 
} from 'lucide-vue-next';
import { ref } from 'vue';
import type { CustomerOrder, MenuItem, AppSettings } from '../types';
import { formatCateringVendorOrder, createWhatsAppUrl } from '../utils/whatsapp';

const props = defineProps<{
  show: boolean;
  orders: CustomerOrder[];
  menus: MenuItem[];
  settings: AppSettings | null;
  activeSession: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const copied = ref(false);

// Aggregate items
const aggregatedItems = computed(() => {
  const map = new Map<string, { qty: number; notes: string[]; unitCost: number }>();

  for (const ord of props.orders) {
    for (const item of ord.items) {
      const existing = map.get(item.menuName) || { qty: 0, notes: [], unitCost: item.unitPrice };
      existing.qty += item.qty;

      // Find matching cost price from menu list if available
      const matchedMenu = props.menus.find(m => m.name === item.menuName);
      if (matchedMenu) {
        existing.unitCost = matchedMenu.costPrice;
      }

      if (item.notes && item.notes.trim()) {
        existing.notes.push(`${ord.customerName}: ${item.notes.trim()}`);
      }
      map.set(item.menuName, existing);
    }
  }

  return Array.from(map.entries()).map(([name, data]) => ({
    name,
    qty: data.qty,
    notes: data.notes,
    unitCost: data.unitCost,
    totalCost: data.qty * data.unitCost,
  }));
});

const totalVendorCost = computed(() => {
  return aggregatedItems.value.reduce((sum, it) => sum + it.totalCost, 0);
});

const totalPorsi = computed(() => {
  return aggregatedItems.value.reduce((sum, it) => sum + it.qty, 0);
});

const formattedWhatsAppText = computed(() => {
  return formatCateringVendorOrder(
    props.settings?.cateringName || 'Katering',
    props.orders,
    props.activeSession
  );
});

function copyToClipboard() {
  navigator.clipboard.writeText(formattedWhatsAppText.value);
  copied.value = true;
  setTimeout(() => copied.value = false, 2000);
}

function sendToWhatsApp() {
  const phone = props.settings?.cateringPhone || '';
  if (!phone) {
    alert('Nomor WhatsApp katering belum diatur di Pengaturan.');
    return;
  }
  const url = createWhatsAppUrl(phone, formattedWhatsAppText.value);
  window.open(url, '_blank');
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-white">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
            <Send class="w-5 h-5 text-emerald-200" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900">Rekap Pesanan ke Katering</h2>
            <p class="text-xs text-slate-500">Agregasi semua porsi pesanan untuk dikirim langsung via WhatsApp ke vendor katering.</p>
          </div>
        </div>
        <button @click="emit('close')" class="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 overflow-y-auto flex-1 space-y-5">
        
        <!-- Summary Badge Bar -->
        <div class="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-center">
          <div>
            <span class="text-[11px] text-slate-500 block">Total Pemesan</span>
            <span class="text-sm sm:text-base font-bold text-slate-800">{{ orders.length }} orang</span>
          </div>
          <div>
            <span class="text-[11px] text-slate-500 block">Total Item/Porsi</span>
            <span class="text-sm sm:text-base font-bold text-emerald-700">{{ totalPorsi }} porsi</span>
          </div>
          <div>
            <span class="text-[11px] text-slate-500 block">Est. Tagihan Katering</span>
            <span class="text-sm sm:text-base font-bold text-slate-800">Rp {{ totalVendorCost.toLocaleString('id-ID') }}</span>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="orders.length === 0" class="py-8 text-center text-slate-400 text-xs">
          Belum ada pesanan yang tercatat pada tanggal sesi ini.
        </div>

        <!-- Table of aggregated items -->
        <div v-else class="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <table class="w-full text-left text-xs sm:text-sm border-collapse">
            <thead class="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th class="py-2 px-3">No</th>
                <th class="py-2 px-3">Menu Pesanan</th>
                <th class="py-2 px-3 text-center">Jumlah</th>
                <th class="py-2 px-3">Catatan Khusus</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              <tr v-for="(it, idx) in aggregatedItems" :key="idx" class="hover:bg-slate-50">
                <td class="py-2 px-3 text-slate-400 font-mono">{{ idx + 1 }}</td>
                <td class="py-2 px-3 font-semibold text-slate-800">{{ it.name }}</td>
                <td class="py-2 px-3 text-center font-bold text-emerald-700">
                  <span class="px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-200">
                    {{ it.qty }} porsi
                  </span>
                </td>
                <td class="py-2 px-3 text-xs text-slate-500 italic">
                  <span v-if="it.notes.length > 0">{{ it.notes.join('; ') }}</span>
                  <span v-else class="text-slate-300">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Text Preview Container -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <MessageSquare class="w-3.5 h-3.5 text-emerald-600" />
              Preview Format Pesan WhatsApp:
            </label>
            <button
              @click="copyToClipboard"
              class="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
            >
              <Check v-if="copied" class="w-3.5 h-3.5 text-emerald-600" />
              <Copy v-else class="w-3.5 h-3.5" />
              <span>{{ copied ? 'Tersalin!' : 'Salin Teks' }}</span>
            </button>
          </div>
          <pre class="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border border-slate-800">{{ formattedWhatsAppText }}</pre>
        </div>

      </div>

      <!-- Footer -->
      <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <div class="text-xs text-slate-500">
          Tujuan: <span class="font-bold text-slate-700">{{ settings?.cateringName || 'Katering' }}</span>
          <span v-if="settings?.cateringPhone" class="ml-1 text-slate-400">({{ settings.cateringPhone }})</span>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="emit('close')"
            class="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs sm:text-sm font-medium transition"
          >
            Tutup
          </button>
          <button
            @click="sendToWhatsApp"
            :disabled="orders.length === 0"
            class="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs sm:text-sm shadow-md transition active:scale-95"
          >
            <Send class="w-4 h-4" />
            <span>Kirim ke WA Katering</span>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>
