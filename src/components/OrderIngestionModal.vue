<script setup lang="ts">
import { ref } from 'vue';
import { 
  X, 
  Sparkles, 
  Trash2, 
  Plus, 
  Check, 
  AlertCircle,
  ArrowRight,
  ClipboardPaste
} from 'lucide-vue-next';
import type { MenuItem, ParsedItemCandidate, CustomerOrder } from '../types';
import { parseOrderText } from '../utils/aiParser';
import { db } from '../db';

const props = defineProps<{
  show: boolean;
  availableMenus: MenuItem[];
  activeSession: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'orders-saved'): void;
}>();

const rawText = ref('');
const parsedCandidates = ref<ParsedItemCandidate[]>([]);
const isParsed = ref(false);

const sampleNotes = [
  `Budi: Nasi rames ayam 1 (sambal pisah), es teh 2\nSiti - Nasi kuning komplit x2\nRian: nasi bakar tongkol 1 pedes, es jeruk 1\nDewi pesan rendang sapi 1, kerupuk 2`,
  `1. Dimas: Nasi rames rendang 1 + air mineral 1\n2. Maya: Gado gado lontong 1, es teh 1\n3. Doni: Nasi rames ayam 2 (gak pake sayur), gorengan 3`,
];

function loadSample(index: number) {
  rawText.value = sampleNotes[index];
  runParse();
}

function runParse() {
  if (!rawText.value.trim()) return;
  parsedCandidates.value = parseOrderText(rawText.value, props.availableMenus);
  isParsed.value = true;
}

function resetForm() {
  rawText.value = '';
  parsedCandidates.value = [];
  isParsed.value = false;
}

function removeCandidate(index: number) {
  parsedCandidates.value.splice(index, 1);
}

function removeItemFromCandidate(cIndex: number, iIndex: number) {
  parsedCandidates.value[cIndex].items.splice(iIndex, 1);
  if (parsedCandidates.value[cIndex].items.length === 0) {
    parsedCandidates.value.splice(cIndex, 1);
  }
}

function addItemToCandidate(cIndex: number) {
  const defaultMenu = props.availableMenus[0];
  parsedCandidates.value[cIndex].items.push({
    menuName: defaultMenu ? defaultMenu.name : 'Item Baru',
    qty: 1,
    matchedMenuItem: defaultMenu,
    unitPrice: defaultMenu ? defaultMenu.sellingPrice : 15000,
  });
}

function onMenuSelect(cIndex: number, iIndex: number, menuName: string) {
  const selected = props.availableMenus.find(m => m.name === menuName);
  if (selected) {
    parsedCandidates.value[cIndex].items[iIndex].menuName = selected.name;
    parsedCandidates.value[cIndex].items[iIndex].matchedMenuItem = selected;
    parsedCandidates.value[cIndex].items[iIndex].unitPrice = selected.sellingPrice;
  }
}

// Calculate candidate total
function getCandidateTotal(cand: ParsedItemCandidate): number {
  return cand.items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
}

// Save all to database
async function saveAllOrders() {
  const now = new Date().toISOString();

  const ordersToInsert: CustomerOrder[] = parsedCandidates.value.map(cand => ({
    sessionId: props.activeSession,
    customerName: cand.customerName,
    customerPhone: cand.customerPhone || '',
    items: cand.items.map(it => ({
      menuId: it.matchedMenuItem?.id,
      menuName: it.menuName,
      qty: it.qty,
      unitPrice: it.unitPrice,
      notes: it.notes || '',
      subtotal: it.qty * it.unitPrice,
    })),
    totalAmount: getCandidateTotal(cand),
    isPaid: false,
    createdAt: now,
  }));

  if (ordersToInsert.length > 0) {
    await db.orders.bulkAdd(ordersToInsert);
    emit('orders-saved');
    resetForm();
    emit('close');
  }
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-white">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
            <Sparkles class="w-5 h-5 text-emerald-200" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900">AI Smart Ingestion (Notepad / WA)</h2>
            <p class="text-xs text-slate-500">Salin catatan pesanan teks acak dari Notepad atau chat, AI akan mengonversinya secara otomatis.</p>
          </div>
        </div>
        <button @click="emit('close')" class="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 overflow-y-auto flex-1 space-y-6">
        
        <!-- Step 1: Input Raw Text -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <ClipboardPaste class="w-3.5 h-3.5 text-emerald-600" />
              1. Tempelkan Teks Catatan Pesanan
            </label>
            <div class="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Coba contoh:</span>
              <button 
                v-for="(sample, idx) in sampleNotes" 
                :key="idx" 
                @click="loadSample(idx)"
                class="px-2 py-0.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-600 rounded font-medium text-[11px] transition"
              >
                Contoh {{ idx + 1 }}
              </button>
            </div>
          </div>

          <textarea
            v-model="rawText"
            rows="5"
            placeholder="Contoh format bebas yang didukung:&#10;Budi: Nasi rames ayam 1 (sambel dipisah), es teh 2&#10;Siti - 2x Nasi kuning komplit&#10;Rian pesan rendang 1, kerupuk 2"
            class="w-full font-mono text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          ></textarea>

          <div class="mt-3 flex items-center justify-between">
            <span class="text-xs text-slate-400">
              *Menu dicocokkan otomatis menggunakan fuzzy matching ke katalog menu Anda.
            </span>
            <button
              @click="runParse"
              :disabled="!rawText.trim()"
              class="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-semibold text-xs sm:text-sm transition shadow-sm"
            >
              <Sparkles class="w-4 h-4" />
              <span>Ekstrak & Analisis Teks</span>
            </button>
          </div>
        </div>

        <!-- Step 2: Parsed Result Preview & Edit -->
        <div v-if="isParsed">
          <div class="flex items-center justify-between mb-3 border-t border-slate-100 pt-5">
            <div>
              <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Check class="w-4 h-4 text-emerald-600" />
                2. Verifikasi Hasil Parsing ({{ parsedCandidates.length }} Pemesan)
              </h3>
              <p class="text-xs text-slate-500">Periksa nama, item menu, kuantitas, harga dan catatan sebelum disimpan.</p>
            </div>
          </div>

          <div v-if="parsedCandidates.length === 0" class="p-6 bg-amber-50 rounded-xl border border-amber-200 text-center">
            <AlertCircle class="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p class="text-sm font-semibold text-amber-800">Tidak ada pesanan yang berhasil diekstrak.</p>
            <p class="text-xs text-amber-600 mt-1">Pastikan ada nama dan item menu di tiap baris.</p>
          </div>

          <!-- Candidates List -->
          <div v-else class="space-y-4">
            <div 
              v-for="(cand, cIdx) in parsedCandidates" 
              :key="cIdx"
              class="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition"
            >
              <div class="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200">
                <div class="flex items-center gap-2 flex-1 min-w-[200px]">
                  <span class="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                    {{ cIdx + 1 }}
                  </span>
                  <input
                    v-model="cand.customerName"
                    type="text"
                    placeholder="Nama Pemesan"
                    class="font-bold text-sm bg-white border border-slate-200 rounded px-2.5 py-1 text-slate-800 focus:ring-2 focus:ring-emerald-500 w-44"
                  />
                  <input
                    v-model="cand.customerPhone"
                    type="text"
                    placeholder="No WA (opsional)"
                    class="text-xs bg-white border border-slate-200 rounded px-2.5 py-1 text-slate-600 w-36"
                  />
                </div>

                <div class="flex items-center gap-3">
                  <span class="text-xs font-semibold text-slate-700">
                    Total: <span class="text-emerald-700 font-bold">Rp {{ getCandidateTotal(cand).toLocaleString('id-ID') }}</span>
                  </span>
                  <button 
                    @click="removeCandidate(cIdx)"
                    class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                    title="Hapus pemesan ini"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- Items table for this customer -->
              <div class="space-y-2">
                <div 
                  v-for="(item, iIdx) in cand.items" 
                  :key="iIdx"
                  class="flex flex-wrap items-center gap-2 text-xs bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs"
                >
                  <!-- Menu selector or custom input -->
                  <div class="flex-1 min-w-[180px]">
                    <select
                      :value="item.matchedMenuItem?.name || item.menuName"
                      @change="onMenuSelect(cIdx, iIdx, ($event.target as HTMLSelectElement).value)"
                      class="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                    >
                      <option 
                        v-for="m in availableMenus" 
                        :key="m.id" 
                        :value="m.name"
                      >
                        {{ m.name }} (Rp {{ m.sellingPrice.toLocaleString('id-ID') }})
                      </option>
                      <option v-if="!item.matchedMenuItem" :value="item.menuName">
                        [Manual] {{ item.menuName }}
                      </option>
                    </select>
                  </div>

                  <!-- Quantity -->
                  <div class="flex items-center gap-1 w-20">
                    <span class="text-slate-400">Qty:</span>
                    <input
                      v-model.number="item.qty"
                      type="number"
                      min="1"
                      class="w-12 text-center bg-slate-50 border border-slate-200 rounded px-1 py-1 font-semibold text-slate-800"
                    />
                  </div>

                  <!-- Unit Price -->
                  <div class="flex items-center gap-1 w-28">
                    <span class="text-slate-400">@Rp:</span>
                    <input
                      v-model.number="item.unitPrice"
                      type="number"
                      class="w-20 bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-right font-medium text-slate-800"
                    />
                  </div>

                  <!-- Notes -->
                  <div class="flex-1 min-w-[120px]">
                    <input
                      v-model="item.notes"
                      type="text"
                      placeholder="Catatan (cth: pedas, es dikit)"
                      class="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-600 italic text-[11px]"
                    />
                  </div>

                  <!-- Subtotal & remove item -->
                  <div class="flex items-center gap-2">
                    <span class="w-20 text-right font-semibold text-slate-700">
                      Rp {{ (item.qty * item.unitPrice).toLocaleString('id-ID') }}
                    </span>
                    <button 
                      @click="removeItemFromCandidate(cIdx, iIdx)"
                      class="p-1 text-slate-300 hover:text-red-500 rounded"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div class="pt-1">
                  <button
                    @click="addItemToCandidate(cIdx)"
                    class="text-[11px] text-emerald-700 font-semibold hover:text-emerald-800 flex items-center gap-1 px-1 py-0.5 rounded hover:bg-emerald-50 transition"
                  >
                    <Plus class="w-3 h-3" />
                    <span>Tambah Item untuk {{ cand.customerName }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <button
          @click="resetForm"
          class="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-xs sm:text-sm transition"
        >
          Reset
        </button>

        <div class="flex items-center gap-3">
          <button
            @click="emit('close')"
            class="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs sm:text-sm font-medium transition"
          >
            Batal
          </button>
          <button
            v-if="isParsed && parsedCandidates.length > 0"
            @click="saveAllOrders"
            class="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs sm:text-sm shadow-md transition active:scale-95"
          >
            <Check class="w-4 h-4" />
            <span>Simpan Semua Pesanan ({{ parsedCandidates.length }})</span>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>
