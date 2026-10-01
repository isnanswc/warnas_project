<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { 
  Sparkles, 
  Send, 
  UtensilsCrossed, 
  QrCode, 
  Settings, 
  Plus, 
  Calendar,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-vue-next';
import { db, seedInitialData } from './db';
import type { MenuItem, CustomerOrder, AppSettings } from './types';

import Navbar from './components/Navbar.vue';
import OrdersTracker from './components/OrdersTracker.vue';
import OrderIngestionModal from './components/OrderIngestionModal.vue';
import MenuManagement from './components/MenuManagement.vue';
import QRISModal from './components/QRISModal.vue';
import CateringSummaryModal from './components/CateringSummaryModal.vue';
import SettingsModal from './components/SettingsModal.vue';
import ManualOrderModal from './components/ManualOrderModal.vue';

// Today's date YYYY-MM-DD
const todayDate = new Date().toISOString().split('T')[0];
const activeSession = ref<string>(todayDate);

// Data state
const menus = ref<MenuItem[]>([]);
const orders = ref<CustomerOrder[]>([]);
const settings = ref<AppSettings | null>(null);

// Modal states
const showAiModal = ref(false);
const showMenuModal = ref(false);
const showQrisModal = ref(false);
const showSummaryModal = ref(false);
const showSettingsModal = ref(false);
const showManualOrderModal = ref(false);

const orderForQris = ref<CustomerOrder | null>(null);
const orderForEdit = ref<CustomerOrder | null>(null);

// Metrics
const orderCount = computed(() => orders.value.length);
const totalRevenue = computed(() => orders.value.reduce((sum, o) => sum + o.totalAmount, 0));
const unpaidOrders = computed(() => orders.value.filter(o => !o.isPaid));
const unpaidCount = computed(() => unpaidOrders.value.length);
const unpaidAmount = computed(() => unpaidOrders.value.reduce((sum, o) => sum + o.totalAmount, 0));

// Estimated profit (total revenue - total cost)
const totalProfit = computed(() => {
  let profit = 0;
  for (const order of orders.value) {
    for (const item of order.items) {
      const match = menus.value.find(m => m.name === item.menuName);
      if (match) {
        profit += item.qty * (item.unitPrice - match.costPrice);
      }
    }
  }
  return profit;
});

async function loadData() {
  menus.value = await db.menus.toArray();
  orders.value = await db.orders.where('sessionId').equals(activeSession.value).toArray();
  const firstSettings = await db.settings.toCollection().first();
  settings.value = firstSettings || null;
}

watch(activeSession, () => {
  loadData();
});

function openQrisForCustomer(order: CustomerOrder) {
  orderForQris.value = order;
  showQrisModal.value = true;
}

function openQrisGeneral() {
  orderForQris.value = null;
  showQrisModal.value = true;
}

function openEditOrder(order: CustomerOrder) {
  orderForEdit.value = order;
  showManualOrderModal.value = true;
}

function openManualOrderNew() {
  orderForEdit.value = null;
  showManualOrderModal.value = true;
}

onMounted(async () => {
  await seedInitialData();
  await loadData();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <!-- Navbar -->
    <Navbar
      :active-session="activeSession"
      :order-count="orderCount"
      :total-revenue="totalRevenue"
      :unpaid-count="unpaidCount"
      :unpaid-amount="unpaidAmount"
      @update:active-session="activeSession = $event"
      @open-ai-modal="showAiModal = true"
      @open-menu-modal="showMenuModal = true"
      @open-qris-modal="openQrisGeneral"
      @open-summary-modal="showSummaryModal = true"
      @open-settings-modal="showSettingsModal = true"
      @open-manual-order-modal="openManualOrderNew"
    />

    <!-- Main Content Container -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
      
      <!-- Top Banner / Workflow Helper if no orders yet -->
      <div 
        v-if="orders.length === 0" 
        class="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-2xl p-6 text-white shadow-md relative overflow-hidden"
      >
        <div class="max-w-2xl relative z-10 space-y-3">
          <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/40 text-emerald-100 text-xs font-semibold backdrop-blur-xs">
            <Sparkles class="w-3.5 h-3.5" />
            <span>Alur Praktis 3-Langkah</span>
          </div>

          <h2 class="text-xl sm:text-2xl font-black tracking-tight">
            Catat Pesanan Notepad Lebih Cepat & Lacak Pembayaran Tanpa Pusing
          </h2>

          <p class="text-xs sm:text-sm text-emerald-100 leading-relaxed">
            Tidak perlu lagi repot menghitung manual di kalkulator atau mencatat siapa yang sudah transfer di buku. 
            Cukup salin teks pesanan dari Notepad atau grup WhatsApp, sistem akan merapikan rinciannya dalam hitungan detik.
          </p>

          <div class="flex flex-wrap items-center gap-3 pt-2">
            <button
              @click="showAiModal = true"
              class="flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-800 rounded-xl font-bold text-xs sm:text-sm shadow hover:bg-emerald-50 transition active:scale-95"
            >
              <Sparkles class="w-4 h-4 text-emerald-600" />
              <span>Coba AI Catat Pesanan Sekarang</span>
            </button>

            <button
              @click="showMenuModal = true"
              class="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700/80 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs sm:text-sm transition"
            >
              <UtensilsCrossed class="w-4 h-4" />
              <span>Sesuaikan Menu & Harga</span>
            </button>
          </div>
        </div>

        <div class="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      <!-- Financial & Stats Summary Bar if orders exist -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <!-- Revenue Card -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span class="text-xs text-slate-400 block font-medium">Total Omzet Hari Ini</span>
            <span class="text-lg sm:text-xl font-black text-slate-800 font-mono">
              Rp {{ totalRevenue.toLocaleString('id-ID') }}
            </span>
          </div>
          <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp class="w-5 h-5" />
          </div>
        </div>

        <!-- Profit Estimate Card -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span class="text-xs text-slate-400 block font-medium">Est. Keuntungan / Margin</span>
            <span class="text-lg sm:text-xl font-black text-emerald-700 font-mono">
              +Rp {{ totalProfit.toLocaleString('id-ID') }}
            </span>
          </div>
          <div class="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Sparkles class="w-5 h-5" />
          </div>
        </div>

        <!-- Dispatch Call to Action -->
        <div class="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-4 rounded-xl border border-emerald-200 shadow-2xs flex items-center justify-between">
          <div>
            <span class="text-xs text-emerald-800 font-bold block">Siap Kirim ke Katering?</span>
            <span class="text-xs text-emerald-600">{{ orderCount }} pemesan telah terdata</span>
          </div>
          <button
            @click="showSummaryModal = true"
            class="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            <Send class="w-3.5 h-3.5" />
            <span>Kirim WA</span>
          </button>
        </div>
      </div>

      <!-- Orders Tracker Table / Grid -->
      <section>
        <div class="flex items-center justify-between mb-3">
          <div>
            <h3 class="text-base font-bold text-slate-800">Daftar Pesanan & Status Bayar</h3>
            <p class="text-xs text-slate-500">Pantau siapa saja yang sudah lunas atau kirim invoice tagihan personal via WhatsApp.</p>
          </div>
        </div>

        <OrdersTracker
          :orders="orders"
          :merchant-name="settings?.merchantName"
          @order-updated="loadData"
          @edit-order="openEditOrder"
          @show-qris-for-order="openQrisForCustomer"
        />
      </section>

    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-slate-200 py-4 mt-auto">
      <div class="max-w-7xl mx-auto px-4 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>WARNAS Order Hub • Client-Side IndexedDB Offline Ready</span>
        <span>Data tersimpan aman di browser lokal Anda</span>
      </div>
    </footer>

    <!-- Modals -->
    <OrderIngestionModal
      :show="showAiModal"
      :available-menus="menus"
      :active-session="activeSession"
      @close="showAiModal = false"
      @orders-saved="loadData"
    />

    <MenuManagement
      :show="showMenuModal"
      :menus="menus"
      @close="showMenuModal = false"
      @menu-updated="loadData"
    />

    <QRISModal
      :show="showQrisModal"
      :target-amount="orderForQris?.totalAmount"
      :customer-name="orderForQris?.customerName"
      @close="showQrisModal = false"
    />

    <CateringSummaryModal
      :show="showSummaryModal"
      :orders="orders"
      :menus="menus"
      :settings="settings"
      :active-session="activeSession"
      @close="showSummaryModal = false"
    />

    <SettingsModal
      :show="showSettingsModal"
      @close="showSettingsModal = false"
      @settings-saved="loadData"
    />

    <ManualOrderModal
      :show="showManualOrderModal"
      :menus="menus"
      :active-session="activeSession"
      :order-to-edit="orderForEdit"
      @close="showManualOrderModal = false"
      @order-saved="loadData"
    />
  </div>
</template>
