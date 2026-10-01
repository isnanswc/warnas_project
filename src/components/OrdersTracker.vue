<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  CheckCircle2, 
  Clock, 
  Search, 
  Send, 
  QrCode, 
  Trash2, 
  Edit3, 
  FileText,
  UserCheck,
  UserX,
  CreditCard,
  MessageCircle,
  Copy,
  Check
} from 'lucide-vue-next';
import confetti from 'canvas-confetti';
import type { CustomerOrder } from '../types';
import { db } from '../db';
import { formatCustomerInvoice, createWhatsAppUrl } from '../utils/whatsapp';

const props = defineProps<{
  orders: CustomerOrder[];
  merchantName?: string;
}>();

const emit = defineEmits<{
  (e: 'order-updated'): void;
  (e: 'edit-order', order: CustomerOrder): void;
  (e: 'show-qris-for-order', order: CustomerOrder): void;
}>();

const searchQuery = ref('');
const statusFilter = ref<'all' | 'unpaid' | 'paid'>('all');
const copiedOrderId = ref<number | null>(null);

const filteredOrders = computed(() => {
  return props.orders.filter(order => {
    // Status Filter
    if (statusFilter.value === 'unpaid' && order.isPaid) return false;
    if (statusFilter.value === 'paid' && !order.isPaid) return false;

    // Search Query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase();
      const matchName = order.customerName.toLowerCase().includes(q);
      const matchItem = order.items.some(it => it.menuName.toLowerCase().includes(q));
      return matchName || matchItem;
    }

    return true;
  });
});

async function togglePaidStatus(order: CustomerOrder) {
  if (!order.id) return;
  const newStatus = !order.isPaid;

  await db.orders.update(order.id, {
    isPaid: newStatus,
    paidAt: newStatus ? new Date().toISOString() : undefined,
  });

  if (newStatus) {
    // Trigger confetti celebration!
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 }
    });
  }

  emit('order-updated');
}

async function deleteOrder(id?: number) {
  if (!id) return;
  if (confirm('Hapus pesanan ini?')) {
    await db.orders.delete(id);
    emit('order-updated');
  }
}

function sendCustomerWhatsApp(order: CustomerOrder) {
  const text = formatCustomerInvoice(order, props.merchantName);

  if (order.customerPhone && order.customerPhone.trim()) {
    const url = createWhatsAppUrl(order.customerPhone, text);
    window.open(url, '_blank');
  } else {
    // If no phone, copy text to clipboard and prompt user
    navigator.clipboard.writeText(text);
    copiedOrderId.value = order.id || null;
    setTimeout(() => { copiedOrderId.value = null; }, 2000);
    alert('Nomor HP tidak tertera. Teks rincian tagihan telah disalin ke clipboard!');
  }
}
</script>

<template>
  <div class="space-y-4">
    
    <!-- Filter and Search Header -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
      
      <!-- Status Tabs -->
      <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
        <button
          @click="statusFilter = 'all'"
          class="px-3 py-1.5 rounded-md text-xs font-semibold transition"
          :class="statusFilter === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
        >
          Semua ({{ orders.length }})
        </button>

        <button
          @click="statusFilter = 'unpaid'"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition"
          :class="statusFilter === 'unpaid' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700 hover:bg-amber-100/50'"
        >
          <Clock class="w-3.5 h-3.5" />
          <span>Belum Bayar ({{ orders.filter(o => !o.isPaid).length }})</span>
        </button>

        <button
          @click="statusFilter = 'paid'"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition"
          :class="statusFilter === 'paid' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-100/50'"
        >
          <CheckCircle2 class="w-3.5 h-3.5" />
          <span>Lunas ({{ orders.filter(o => o.isPaid).length }})</span>
        </button>
      </div>

      <!-- Search Box -->
      <div class="relative w-full sm:w-64">
        <Search class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari nama atau pesanan..."
          class="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        />
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredOrders.length === 0" class="bg-white rounded-2xl border border-slate-200 p-12 text-center">
      <FileText class="w-12 h-12 text-slate-300 mx-auto mb-3" />
      <h3 class="text-sm font-bold text-slate-700">Tidak ada pesanan ditemukan</h3>
      <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
        Gunakan tombol <b>"AI Catat Pesanan"</b> di atas untuk menempelkan catatan pesanan dari Notepad / WA, atau tambahkan secara manual.
      </p>
    </div>

    <!-- Orders Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
      <div
        v-for="order in filteredOrders"
        :key="order.id"
        class="bg-white rounded-xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md"
        :class="order.isPaid ? 'border-slate-200' : 'border-amber-300 ring-1 ring-amber-100'"
      >
        <!-- Card Header -->
        <div class="p-3.5 border-b border-slate-100 flex items-center justify-between" :class="order.isPaid ? 'bg-slate-50/50' : 'bg-amber-50/30'">
          <div>
            <h4 class="font-bold text-slate-900 text-sm leading-tight flex items-center gap-1.5">
              <span>{{ order.customerName }}</span>
              <span v-if="order.customerPhone" class="text-[10px] text-slate-400 font-normal">({{ order.customerPhone }})</span>
            </h4>
            <span class="text-[10px] text-slate-400">
              {{ new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }}
            </span>
          </div>

          <!-- Payment Status Button -->
          <button
            @click="togglePaidStatus(order)"
            class="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition active:scale-95 cursor-pointer"
            :class="order.isPaid 
              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
              : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 animate-pulse'"
            :title="order.isPaid ? 'Klik untuk ubah jadi Belum Bayar' : 'Klik untuk ubah jadi LUNAS'"
          >
            <CheckCircle2 v-if="order.isPaid" class="w-3.5 h-3.5 text-emerald-600" />
            <Clock v-else class="w-3.5 h-3.5 text-amber-600" />
            <span>{{ order.isPaid ? 'LUNAS' : 'BELUM BAYAR' }}</span>
          </button>
        </div>

        <!-- Card Body: Items List -->
        <div class="p-3.5 space-y-2 flex-1">
          <div 
            v-for="(item, idx) in order.items" 
            :key="idx" 
            class="flex items-start justify-between text-xs py-1 border-b border-dashed border-slate-100 last:border-0"
          >
            <div class="pr-2">
              <span class="font-semibold text-slate-800">{{ item.qty }}x</span>
              <span class="text-slate-700 ml-1.5">{{ item.menuName }}</span>
              <p v-if="item.notes" class="text-[10px] text-slate-400 italic mt-0.5">
                ↳ {{ item.notes }}
              </p>
            </div>
            <span class="font-mono text-slate-600 shrink-0 font-medium">
              Rp {{ item.subtotal.toLocaleString('id-ID') }}
            </span>
          </div>
        </div>

        <!-- Card Footer: Total & Actions -->
        <div class="p-3.5 bg-slate-50/80 border-t border-slate-100">
          <!-- Total Row -->
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs text-slate-500 font-medium">Total Tagihan:</span>
            <span class="text-base font-extrabold text-slate-900 font-mono">
              Rp {{ order.totalAmount.toLocaleString('id-ID') }}
            </span>
          </div>

          <!-- Action Buttons Bar -->
          <div class="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-200/60">
            <!-- Send WA Invoice -->
            <button
              @click="sendCustomerWhatsApp(order)"
              class="col-span-2 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition"
              title="Kirim rincian invoice ke WhatsApp pembeli"
            >
              <Send class="w-3.5 h-3.5" />
              <span>{{ copiedOrderId === order.id ? 'Disalin!' : 'Tagih WA' }}</span>
            </button>

            <!-- Show QRIS -->
            <button
              @click="emit('show-qris-for-order', order)"
              class="flex items-center justify-center gap-1 px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition"
              title="Tampilkan QRIS penjual dengan nominal pas"
            >
              <QrCode class="w-3.5 h-3.5" />
              <span class="hidden sm:inline">QRIS</span>
            </button>

            <!-- Edit & Delete -->
            <div class="flex items-center justify-end gap-1">
              <button
                @click="emit('edit-order', order)"
                class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition"
                title="Edit pesanan"
              >
                <Edit3 class="w-3.5 h-3.5" />
              </button>
              <button
                @click="deleteOrder(order.id)"
                class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                title="Hapus pesanan"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>
