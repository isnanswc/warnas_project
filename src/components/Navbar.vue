<script setup lang="ts">
import { 
  Sparkles, 
  UtensilsCrossed, 
  QrCode, 
  Send, 
  Settings, 
  Plus, 
  CircleDollarSign,
  Users
} from 'lucide-vue-next';

defineProps<{
  activeSession: string;
  orderCount: number;
  totalRevenue: number;
  unpaidCount: number;
  unpaidAmount: number;
}>();

const emit = defineEmits<{
  (e: 'update:activeSession', val: string): void;
  (e: 'open-ai-modal'): void;
  (e: 'open-menu-modal'): void;
  (e: 'open-qris-modal'): void;
  (e: 'open-summary-modal'): void;
  (e: 'open-settings-modal'): void;
  (e: 'open-manual-order-modal'): void;
}>();
</script>

<template>
  <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Main Nav Row -->
      <div class="flex items-center justify-between h-16 gap-3">
        <!-- Logo & Title -->
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <UtensilsCrossed class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-base sm:text-lg font-bold text-slate-800 leading-none">WARNAS Hub</h1>
              <span class="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Client AI</span>
            </div>
            <p class="text-xs text-slate-500 hidden sm:block">Perantara Katering & Pelacak Tagihan</p>
          </div>
        </div>

        <!-- Session Date Selector -->
        <div class="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs sm:text-sm">
          <span class="text-slate-500 px-2 font-medium hidden md:inline">Tanggal:</span>
          <input 
            type="date" 
            :value="activeSession"
            @input="emit('update:activeSession', ($event.target as HTMLInputElement).value)"
            class="bg-white border border-slate-200 rounded px-2 py-1 font-semibold text-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2">
          <!-- AI Ingestion Button -->
          <button
            @click="emit('open-ai-modal')"
            class="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg font-medium text-xs sm:text-sm shadow-sm transition active:scale-95"
            title="Tempel teks rekapan Notepad/WA untuk diproses otomatis"
          >
            <Sparkles class="w-4 h-4 text-emerald-200 animate-pulse" />
            <span class="font-semibold">AI Catat Pesanan</span>
          </button>

          <!-- Rekap Katering -->
          <button
            @click="emit('open-summary-modal')"
            class="hidden md:flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-medium text-xs sm:text-sm transition"
          >
            <Send class="w-4 h-4" />
            <span>Kirim Katering</span>
          </button>

          <!-- Kelola Menu -->
          <button
            @click="emit('open-menu-modal')"
            class="flex items-center gap-1.5 px-2.5 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs sm:text-sm transition"
            title="Kelola Menu & Harga"
          >
            <UtensilsCrossed class="w-4 h-4" />
            <span class="hidden lg:inline">Menu & Harga</span>
          </button>

          <!-- QRIS Penjual -->
          <button
            @click="emit('open-qris-modal')"
            class="flex items-center gap-1.5 px-2.5 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs sm:text-sm transition"
            title="Lihat / Kelola QRIS Penjual"
          >
            <QrCode class="w-4 h-4" />
            <span class="hidden lg:inline">QRIS</span>
          </button>

          <!-- Settings -->
          <button
            @click="emit('open-settings-modal')"
            class="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            title="Pengaturan Katering"
          >
            <Settings class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Quick Metrics Strip -->
      <div class="py-2.5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div class="flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-100">
          <Users class="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <span class="text-slate-500 block text-[10px]">Total Pemesan</span>
            <span class="font-bold text-slate-700">{{ orderCount }} orang</span>
          </div>
        </div>

        <div class="flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-100">
          <CircleDollarSign class="w-4 h-4 text-emerald-500 shrink-0" />
          <div>
            <span class="text-slate-500 block text-[10px]">Total Tagihan</span>
            <span class="font-bold text-emerald-700">Rp {{ totalRevenue.toLocaleString('id-ID') }}</span>
          </div>
        </div>

        <div class="flex items-center gap-2 px-2.5 py-1.5 rounded-md border transition" :class="unpaidCount > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-100'">
          <div class="w-2.5 h-2.5 rounded-full shrink-0" :class="unpaidCount > 0 ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'"></div>
          <div>
            <span class="text-slate-500 block text-[10px]">Belum Bayar</span>
            <span class="font-bold" :class="unpaidCount > 0 ? 'text-amber-700' : 'text-slate-700'">
              {{ unpaidCount }} orang (Rp {{ unpaidAmount.toLocaleString('id-ID') }})
            </span>
          </div>
        </div>

        <div class="flex items-center justify-end sm:justify-start gap-1">
          <button 
            @click="emit('open-manual-order-modal')"
            class="w-full h-full flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium text-xs transition"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Tambah Manual</span>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
