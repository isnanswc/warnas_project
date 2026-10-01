<script setup lang="ts">
import { ref, watch } from 'vue';
import { 
  X, 
  Settings as SettingsIcon, 
  Save, 
  QrCode, 
  Phone, 
  Store,
  Upload,
  RotateCcw
} from 'lucide-vue-next';
import { db, seedInitialData } from '../db';
import { fileToDataUrl } from '../utils/qris';
import type { AppSettings } from '../types';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'settings-saved'): void;
}>();

const currentSettings = ref<AppSettings>({
  cateringName: '',
  cateringPhone: '',
  merchantName: '',
  qrisImageDataUrl: '',
  qrisRawString: '',
});

const isSaved = ref(false);

async function loadSettings() {
  const first = await db.settings.toCollection().first();
  if (first) {
    currentSettings.value = { ...first };
  }
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    loadSettings();
  }
});

async function handleQrisUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  const dataUrl = await fileToDataUrl(file);
  currentSettings.value.qrisImageDataUrl = dataUrl;
}

async function saveSettings() {
  const existing = await db.settings.toCollection().first();
  if (existing && existing.id) {
    await db.settings.update(existing.id, {
      cateringName: currentSettings.value.cateringName,
      cateringPhone: currentSettings.value.cateringPhone,
      merchantName: currentSettings.value.merchantName,
      qrisImageDataUrl: currentSettings.value.qrisImageDataUrl,
      qrisRawString: currentSettings.value.qrisRawString,
    });
  } else {
    await db.settings.add({
      cateringName: currentSettings.value.cateringName,
      cateringPhone: currentSettings.value.cateringPhone,
      merchantName: currentSettings.value.merchantName,
      qrisImageDataUrl: currentSettings.value.qrisImageDataUrl,
      qrisRawString: currentSettings.value.qrisRawString,
    });
  }

  isSaved.value = true;
  emit('settings-saved');
  setTimeout(() => {
    isSaved.value = false;
    emit('close');
  }, 800);
}

async function resetAllData() {
  if (confirm('PERINGATAN: Ini akan mereset seluruh data pesanan dan menu ke default. Lanjutkan?')) {
    await db.orders.clear();
    await db.menus.clear();
    await db.settings.clear();
    await seedInitialData();
    await loadSettings();
    emit('settings-saved');
    alert('Data berhasil direset.');
  }
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-white shadow-sm">
            <SettingsIcon class="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-bold text-slate-900">Pengaturan Katering & QRIS</h2>
            <p class="text-xs text-slate-500">Konfigurasi kontak vendor katering dan gambar QRIS penjual</p>
          </div>
        </div>
        <button @click="emit('close')" class="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Form Body -->
      <form @submit.prevent="saveSettings" class="p-6 overflow-y-auto flex-1 space-y-4">
        
        <!-- Catering Name -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Store class="w-3.5 h-3.5 text-slate-500" />
            Nama Vendor Katering
          </label>
          <input
            v-model="currentSettings.cateringName"
            type="text"
            required
            placeholder="cth: Katering Bu Sri / Dapur Berkah"
            class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <!-- Catering Phone -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Phone class="w-3.5 h-3.5 text-slate-500" />
            Nomor WhatsApp Katering (Vendor)
          </label>
          <input
            v-model="currentSettings.cateringPhone"
            type="text"
            required
            placeholder="cth: 08123456789 atau 628123456789"
            class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <p class="text-[11px] text-slate-400 mt-1">Digunakan untuk tombol langsung kirim format rekap pesanan ke WA vendor.</p>
        </div>

        <!-- Coordinator Title -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            Nama Anda / Koordinator (untuk kop pesan invoice)
          </label>
          <input
            v-model="currentSettings.merchantName"
            type="text"
            placeholder="cth: Koordinator Pesanan Divisi IT"
            class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <!-- QRIS Upload Section -->
        <div class="border-t border-slate-100 pt-4">
          <label class="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <QrCode class="w-3.5 h-3.5 text-slate-500" />
            Gambar Kode QRIS Penjual
          </label>

          <div class="flex items-center gap-4">
            <div class="w-24 h-24 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
              <img 
                v-if="currentSettings.qrisImageDataUrl" 
                :src="currentSettings.qrisImageDataUrl" 
                alt="QRIS" 
                class="w-full h-full object-cover"
              />
              <span v-else class="text-[10px] text-slate-400 text-center px-1">Belum Ada QRIS</span>
            </div>

            <div class="flex-1">
              <label class="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition">
                <Upload class="w-3.5 h-3.5" />
                <span>Pilih Foto QRIS</span>
                <input type="file" accept="image/*" @change="handleQrisUpload" class="hidden" />
              </label>
              <p class="text-[11px] text-slate-400 mt-1.5 leading-normal">
                Foto QRIS disimpan lokal di browser (IndexedDB). Bisa dimunculkan ke pembeli untuk pembayaran langsung.
              </p>
            </div>
          </div>
        </div>

        <!-- Danger Zone Reset -->
        <div class="border-t border-slate-100 pt-3 flex justify-between items-center text-xs">
          <span class="text-slate-400">Reset Data Demo:</span>
          <button
            type="button"
            @click="resetAllData"
            class="text-red-500 hover:text-red-700 flex items-center gap-1 font-semibold"
          >
            <RotateCcw class="w-3 h-3" />
            <span>Reset ke Data Awal</span>
          </button>
        </div>

        <!-- Submit Button -->
        <div class="pt-4 flex justify-end gap-2 border-t border-slate-100">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs sm:text-sm font-medium transition"
          >
            Batal
          </button>
          <button
            type="submit"
            class="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-bold shadow transition"
          >
            <Save class="w-4 h-4" />
            <span>{{ isSaved ? 'Tersimpan!' : 'Simpan Pengaturan' }}</span>
          </button>
        </div>

      </form>

    </div>
  </div>
</template>
