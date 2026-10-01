<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { 
  X, 
  Upload, 
  QrCode, 
  Download, 
  Image as ImageIcon,
  CheckCircle,
  Copy,
  AlertCircle
} from 'lucide-vue-next';
import { db } from '../db';
import { fileToDataUrl, generateQrCodeDataUrl, convertStaticQrisToDynamic } from '../utils/qris';
import type { AppSettings } from '../types';

const props = defineProps<{
  show: boolean;
  targetAmount?: number;
  customerName?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const settings = ref<AppSettings | null>(null);
const previewImage = ref<string>('');
const isUploading = ref(false);
const dynamicQrDataUrl = ref<string>('');
const copied = ref(false);

async function loadSettings() {
  const first = await db.settings.toCollection().first();
  if (first) {
    settings.value = first;
    previewImage.value = first.qrisImageDataUrl || '';
    if (first.qrisRawString && props.targetAmount) {
      await updateDynamicQr();
    }
  }
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    loadSettings();
  }
});

watch(() => props.targetAmount, async () => {
  if (settings.value?.qrisRawString && props.targetAmount) {
    await updateDynamicQr();
  }
});

async function updateDynamicQr() {
  if (!settings.value?.qrisRawString || !props.targetAmount) return;
  const dynPayload = convertStaticQrisToDynamic(settings.value.qrisRawString, props.targetAmount);
  dynamicQrDataUrl.value = await generateQrCodeDataUrl(dynPayload);
}

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  isUploading.value = true;
  try {
    const dataUrl = await fileToDataUrl(file);
    previewImage.value = dataUrl;

    // Save to IndexedDB settings
    if (settings.value && settings.value.id) {
      await db.settings.update(settings.value.id, {
        qrisImageDataUrl: dataUrl
      });
    } else {
      await db.settings.add({
        cateringName: 'Katering Berkah',
        cateringPhone: '',
        qrisImageDataUrl: dataUrl
      });
    }
    await loadSettings();
  } catch (err) {
    console.error('Error reading image', err);
  } finally {
    isUploading.value = false;
  }
}

function copyAmount() {
  if (props.targetAmount) {
    navigator.clipboard.writeText(props.targetAmount.toString());
    copied.value = true;
    setTimeout(() => copied.value = false, 2000);
  }
}

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-white shadow-sm">
            <QrCode class="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-bold text-slate-900">QRIS Pembayaran Penjual</h2>
            <p class="text-xs text-slate-500">Scan untuk bayar pesanan langsung ke katering/penjual</p>
          </div>
        </div>
        <button @click="emit('close')" class="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 flex-1 flex flex-col items-center justify-center space-y-4">
        
        <!-- Target Amount Banner if opened from specific customer -->
        <div v-if="targetAmount" class="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <span class="text-xs text-emerald-700 block font-medium">Tagihan untuk: <b>{{ customerName }}</b></span>
          <div class="flex items-center justify-center gap-2 mt-1">
            <span class="text-xl font-extrabold text-emerald-900">
              Rp {{ targetAmount.toLocaleString('id-ID') }}
            </span>
            <button 
              @click="copyAmount" 
              class="p-1 text-emerald-600 hover:bg-emerald-100 rounded transition"
              title="Salin Angka Nominal"
            >
              <Copy class="w-4 h-4" />
            </button>
          </div>
          <span v-if="copied" class="text-[11px] text-emerald-600 font-semibold">Nominal disalin!</span>
        </div>

        <!-- QR Display Container -->
        <div class="w-72 h-72 sm:w-80 sm:h-80 border-2 border-dashed border-slate-300 rounded-2xl p-3 flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden group">
          
          <!-- Image preview if uploaded -->
          <template v-if="previewImage">
            <img 
              :src="previewImage" 
              alt="QRIS Penjual" 
              class="w-full h-full object-contain rounded-xl"
            />
          </template>

          <!-- Fallback or dynamic generated QR -->
          <template v-else-if="dynamicQrDataUrl">
            <img 
              :src="dynamicQrDataUrl" 
              alt="QRIS Dinamis" 
              class="w-full h-full object-contain rounded-xl"
            />
          </template>

          <!-- Placeholder when no QR uploaded yet -->
          <template v-else>
            <div class="text-center p-4">
              <ImageIcon class="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p class="text-xs font-semibold text-slate-600">Belum ada gambar QRIS</p>
              <p class="text-[11px] text-slate-400 mt-1">Unggah foto QRIS katering atau rekening penjual di bawah.</p>
            </div>
          </template>

          <!-- Upload overlay button -->
          <label class="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer backdrop-blur-2xs">
            <Upload class="w-7 h-7 mb-1" />
            <span class="text-xs font-semibold">Ganti Gambar QRIS</span>
            <input 
              type="file" 
              accept="image/*" 
              @change="handleFileUpload" 
              class="hidden" 
            />
          </label>
        </div>

        <!-- Merchant Info -->
        <div class="text-center">
          <h4 class="font-bold text-slate-800 text-sm">
            {{ settings?.cateringName || 'Katering / Penjual' }}
          </h4>
          <p class="text-xs text-slate-400">Tersimpan lokal di IndexedDB perangkat Anda</p>
        </div>

        <!-- Upload Button (visible always for convenience) -->
        <div class="w-full pt-2">
          <label class="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-300 hover:bg-slate-50 rounded-xl cursor-pointer text-slate-700 text-xs sm:text-sm font-semibold transition">
            <Upload class="w-4 h-4 text-slate-500" />
            <span>{{ previewImage ? 'Ganti Foto QRIS' : 'Unggah Foto QRIS' }}</span>
            <input 
              type="file" 
              accept="image/*" 
              @change="handleFileUpload" 
              class="hidden" 
            />
          </label>
        </div>

      </div>

      <!-- Footer -->
      <div class="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
        <button
          @click="emit('close')"
          class="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs sm:text-sm font-semibold transition"
        >
          Tutup
        </button>
      </div>

    </div>
  </div>
</template>
