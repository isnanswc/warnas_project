<script setup lang="ts">
import { ref, watch } from 'vue';
import { 
  X, 
  Plus, 
  Trash2, 
  Check, 
  User, 
  Phone
} from 'lucide-vue-next';
import type { MenuItem, CustomerOrder, OrderItem } from '../types';
import { db } from '../db';

const props = defineProps<{
  show: boolean;
  menus: MenuItem[];
  activeSession: string;
  orderToEdit?: CustomerOrder | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'order-saved'): void;
}>();

const customerName = ref('');
const customerPhone = ref('');
const isPaid = ref(false);
const items = ref<OrderItem[]>([]);

function initForm() {
  if (props.orderToEdit) {
    customerName.value = props.orderToEdit.customerName;
    customerPhone.value = props.orderToEdit.customerPhone || '';
    isPaid.value = props.orderToEdit.isPaid;
    items.value = JSON.parse(JSON.stringify(props.orderToEdit.items));
  } else {
    customerName.value = '';
    customerPhone.value = '';
    isPaid.value = false;
    items.value = [];
    addNewItemRow();
  }
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    initForm();
  }
});

function addNewItemRow() {
  const defaultMenu = props.menus[0];
  items.value.push({
    menuId: defaultMenu?.id,
    menuName: defaultMenu ? defaultMenu.name : 'Item Baru',
    qty: 1,
    unitPrice: defaultMenu ? defaultMenu.sellingPrice : 15000,
    subtotal: defaultMenu ? defaultMenu.sellingPrice : 15000,
    notes: '',
  });
}

function onMenuSelect(index: number, menuName: string) {
  const selected = props.menus.find(m => m.name === menuName);
  if (selected) {
    items.value[index].menuId = selected.id;
    items.value[index].menuName = selected.name;
    items.value[index].unitPrice = selected.sellingPrice;
    items.value[index].subtotal = items.value[index].qty * selected.sellingPrice;
  }
}

function updateItemSubtotal(index: number) {
  items.value[index].subtotal = items.value[index].qty * items.value[index].unitPrice;
}

function removeItemRow(index: number) {
  items.value.splice(index, 1);
  if (items.value.length === 0) {
    addNewItemRow();
  }
}

function getTotalAmount(): number {
  return items.value.reduce((sum, it) => sum + (it.qty * it.unitPrice), 0);
}

async function saveOrder() {
  if (!customerName.value.trim()) {
    alert('Nama pemesan harus diisi.');
    return;
  }

  const total = getTotalAmount();

  if (props.orderToEdit && props.orderToEdit.id) {
    await db.orders.update(props.orderToEdit.id, {
      customerName: customerName.value.trim(),
      customerPhone: customerPhone.value.trim(),
      items: items.value.map(it => ({
        ...it,
        subtotal: it.qty * it.unitPrice,
      })),
      totalAmount: total,
      isPaid: isPaid.value,
    });
  } else {
    await db.orders.add({
      sessionId: props.activeSession,
      customerName: customerName.value.trim(),
      customerPhone: customerPhone.value.trim(),
      items: items.value.map(it => ({
        ...it,
        subtotal: it.qty * it.unitPrice,
      })),
      totalAmount: total,
      isPaid: isPaid.value,
      createdAt: new Date().toISOString(),
    });
  }

  emit('order-saved');
  emit('close');
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div>
          <h2 class="text-base sm:text-lg font-bold text-slate-900">
            {{ orderToEdit ? 'Edit Pesanan' : 'Tambah Pesanan Manual' }}
          </h2>
          <p class="text-xs text-slate-500">Input pesanan langsung untuk pembeli individu</p>
        </div>
        <button @click="emit('close')" class="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Form Body -->
      <form @submit.prevent="saveOrder" class="p-6 overflow-y-auto flex-1 space-y-4">
        
        <!-- Customer Info -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <User class="w-3.5 h-3.5 text-slate-400" />
              Nama Pemesan *
            </label>
            <input
              v-model="customerName"
              type="text"
              required
              placeholder="cth: Mas Budi"
              class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Phone class="w-3.5 h-3.5 text-slate-400" />
              No. WhatsApp (opsional)
            </label>
            <input
              v-model="customerPhone"
              type="text"
              placeholder="cth: 08123456789"
              class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <!-- Items Header -->
        <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
          <label class="text-xs font-bold uppercase tracking-wider text-slate-600">
            Daftar Menu yang Dipesan
          </label>
          <button
            type="button"
            @click="addNewItemRow"
            class="text-xs text-emerald-700 font-semibold hover:text-emerald-800 flex items-center gap-1"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Tambah Baris</span>
          </button>
        </div>

        <!-- Items List -->
        <div class="space-y-2">
          <div 
            v-for="(item, idx) in items" 
            :key="idx"
            class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
          >
            <div class="flex items-center gap-2">
              <select
                :value="item.menuName"
                @change="onMenuSelect(idx, ($event.target as HTMLSelectElement).value)"
                class="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800"
              >
                <option v-for="m in menus" :key="m.id" :value="m.name">
                  {{ m.name }} - Rp {{ m.sellingPrice.toLocaleString('id-ID') }}
                </option>
              </select>

              <button
                type="button"
                @click="removeItemRow(idx)"
                class="p-1.5 text-slate-400 hover:text-red-500 rounded"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>

            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1 w-24">
                <span class="text-slate-400">Qty:</span>
                <input
                  v-model.number="item.qty"
                  @input="updateItemSubtotal(idx)"
                  type="number"
                  min="1"
                  class="w-12 bg-white border border-slate-200 rounded px-1.5 py-1 text-center font-bold"
                />
              </div>

              <div class="flex-1">
                <input
                  v-model="item.notes"
                  type="text"
                  placeholder="Catatan porsi (cth: gak pedes, es dikit)"
                  class="w-full bg-white border border-slate-200 rounded px-2.5 py-1 text-slate-600 italic"
                />
              </div>

              <div class="text-right font-bold text-slate-700 min-w-[70px]">
                Rp {{ (item.qty * item.unitPrice).toLocaleString('id-ID') }}
              </div>
            </div>
          </div>
        </div>

        <!-- Total & Paid Status -->
        <div class="pt-3 border-t border-slate-200 flex items-center justify-between">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="isPaid"
              type="checkbox"
              class="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <span class="text-xs font-semibold text-slate-700">Tandai Langsung Lunas</span>
          </label>

          <div class="text-right">
            <span class="text-xs text-slate-400 block">Total Pembayaran:</span>
            <span class="text-lg font-extrabold text-emerald-700">
              Rp {{ getTotalAmount().toLocaleString('id-ID') }}
            </span>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="pt-3 flex justify-end gap-2 border-t border-slate-100">
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
            <Check class="w-4 h-4" />
            <span>Simpan Pesanan</span>
          </button>
        </div>

      </form>

    </div>
  </div>
</template>
