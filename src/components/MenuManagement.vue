<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Utensils, 
  Search,
  CheckCircle,
  XCircle,
  Tag
} from 'lucide-vue-next';
import type { MenuItem } from '../types';
import { db } from '../db';

const props = defineProps<{
  show: boolean;
  menus: MenuItem[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'menu-updated'): void;
}>();

const searchQuery = ref('');
const selectedCategory = ref('Semua');

// Form state for creating/editing
const isEditing = ref(false);
const editId = ref<number | null>(null);
const formName = ref('');
const formCategory = ref('Makanan');
const formCostPrice = ref<number>(15000);
const formSellingPrice = ref<number>(17000);
const formIsActive = ref(true);

const categories = ['Semua', 'Makanan', 'Minuman', 'Tambahan'];

const filteredMenus = computed(() => {
  return props.menus.filter(m => {
    const matchCategory = selectedCategory.value === 'Semua' || m.category === selectedCategory.value;
    const matchQuery = m.name.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchCategory && matchQuery;
  });
});

function resetForm() {
  isEditing.value = false;
  editId.value = null;
  formName.value = '';
  formCategory.value = 'Makanan';
  formCostPrice.value = 15000;
  formSellingPrice.value = 17000;
  formIsActive.value = true;
}

function startEdit(item: MenuItem) {
  isEditing.value = true;
  editId.value = item.id || null;
  formName.value = item.name;
  formCategory.value = item.category;
  formCostPrice.value = item.costPrice;
  formSellingPrice.value = item.sellingPrice;
  formIsActive.value = item.isActive;
}

async function saveMenu() {
  if (!formName.value.trim()) return;

  if (isEditing.value && editId.value) {
    await db.menus.update(editId.value, {
      name: formName.value.trim(),
      category: formCategory.value,
      costPrice: formCostPrice.value,
      sellingPrice: formSellingPrice.value,
      isActive: formIsActive.value,
    });
  } else {
    await db.menus.add({
      name: formName.value.trim(),
      category: formCategory.value,
      costPrice: formCostPrice.value,
      sellingPrice: formSellingPrice.value,
      isActive: formIsActive.value,
    });
  }

  resetForm();
  emit('menu-updated');
}

async function toggleActive(item: MenuItem) {
  if (!item.id) return;
  await db.menus.update(item.id, { isActive: !item.isActive });
  emit('menu-updated');
}

async function deleteMenu(id?: number) {
  if (!id) return;
  if (confirm('Hapus menu ini dari katalog?')) {
    await db.menus.delete(id);
    emit('menu-updated');
  }
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
            <Utensils class="w-5 h-5 text-emerald-200" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900">Kelola Menu & Harga Katering</h2>
            <p class="text-xs text-slate-500">Atur harga modal katering dan harga jual ke pembeli (margin laba otomatis).</p>
          </div>
        </div>
        <button @click="emit('close')" class="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Main Body -->
      <div class="p-6 overflow-y-auto flex-1 space-y-6">
        
        <!-- Add / Edit Form Card -->
        <div class="bg-gradient-to-br from-slate-50 to-emerald-50/30 border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Tag class="w-3.5 h-3.5 text-emerald-600" />
              {{ isEditing ? 'Edit Data Menu' : 'Tambah Menu Baru' }}
            </h3>
            <button 
              v-if="isEditing" 
              @click="resetForm" 
              class="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Batal Edit
            </button>
          </div>

          <form @submit.prevent="saveMenu" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <!-- Name -->
            <div class="sm:col-span-2">
              <label class="block text-[11px] font-semibold text-slate-600 mb-1">Nama Menu</label>
              <input
                v-model="formName"
                type="text"
                placeholder="cth: Nasi Goreng Spesial"
                required
                class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <!-- Category -->
            <div>
              <label class="block text-[11px] font-semibold text-slate-600 mb-1">Kategori</label>
              <select
                v-model="formCategory"
                class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="Makanan">Makanan</option>
                <option value="Minuman">Minuman</option>
                <option value="Tambahan">Tambahan</option>
              </select>
            </div>

            <!-- Cost Price -->
            <div>
              <label class="block text-[11px] font-semibold text-slate-600 mb-1">Harga Modal (Rp)</label>
              <input
                v-model.number="formCostPrice"
                type="number"
                min="0"
                step="500"
                required
                class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <!-- Selling Price -->
            <div>
              <label class="block text-[11px] font-semibold text-slate-600 mb-1">Harga Jual (Rp)</label>
              <input
                v-model.number="formSellingPrice"
                type="number"
                min="0"
                step="500"
                required
                class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <!-- Margin Info & Submit Button -->
            <div class="sm:col-span-2 lg:col-span-5 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/60 mt-1">
              <div class="text-xs text-slate-500 flex items-center gap-2">
                <span>Margin Keuntungan:</span>
                <span 
                  class="font-bold px-2 py-0.5 rounded text-xs"
                  :class="formSellingPrice - formCostPrice >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'"
                >
                  Rp {{ (formSellingPrice - formCostPrice).toLocaleString('id-ID') }} / porsi
                </span>
              </div>

              <button
                type="submit"
                class="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs sm:text-sm transition shadow-sm"
              >
                <Check v-if="isEditing" class="w-4 h-4" />
                <Plus v-else class="w-4 h-4" />
                <span>{{ isEditing ? 'Simpan Perubahan' : 'Tambah ke Menu' }}</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Filter & Search Bar -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <!-- Categories chips -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              v-for="cat in categories"
              :key="cat"
              @click="selectedCategory = cat"
              class="px-3 py-1 rounded-full text-xs font-semibold transition"
              :class="selectedCategory === cat ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            >
              {{ cat }}
            </button>
          </div>

          <!-- Search Input -->
          <div class="relative w-full sm:w-64">
            <Search class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari nama menu..."
              class="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <!-- Menu List Table -->
        <div class="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <table class="w-full text-left text-xs sm:text-sm border-collapse">
            <thead class="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th class="py-2.5 px-3">Status</th>
                <th class="py-2.5 px-3">Nama Menu</th>
                <th class="py-2.5 px-3">Kategori</th>
                <th class="py-2.5 px-3 text-right">Harga Modal</th>
                <th class="py-2.5 px-3 text-right">Harga Jual</th>
                <th class="py-2.5 px-3 text-right">Margin / Porsi</th>
                <th class="py-2.5 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              <tr 
                v-for="menu in filteredMenus" 
                :key="menu.id"
                class="hover:bg-slate-50/80 transition"
              >
                <!-- Status Toggle -->
                <td class="py-2.5 px-3">
                  <button 
                    @click="toggleActive(menu)"
                    class="flex items-center gap-1 text-[11px] font-medium"
                    :class="menu.isActive ? 'text-emerald-700' : 'text-slate-400'"
                    :title="menu.isActive ? 'Menu Tersedia' : 'Menu Nonaktif / Kosong'"
                  >
                    <CheckCircle v-if="menu.isActive" class="w-4 h-4 text-emerald-500 fill-emerald-100" />
                    <XCircle v-else class="w-4 h-4 text-slate-300" />
                    <span class="hidden sm:inline">{{ menu.isActive ? 'Aktif' : 'Kosong' }}</span>
                  </button>
                </td>

                <!-- Menu Name -->
                <td class="py-2.5 px-3 font-semibold text-slate-800">
                  {{ menu.name }}
                </td>

                <!-- Category -->
                <td class="py-2.5 px-3">
                  <span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-medium">
                    {{ menu.category }}
                  </span>
                </td>

                <!-- Cost Price -->
                <td class="py-2.5 px-3 text-right text-slate-500 font-mono">
                  Rp {{ menu.costPrice.toLocaleString('id-ID') }}
                </td>

                <!-- Selling Price -->
                <td class="py-2.5 px-3 text-right font-bold text-slate-800 font-mono">
                  Rp {{ menu.sellingPrice.toLocaleString('id-ID') }}
                </td>

                <!-- Margin -->
                <td class="py-2.5 px-3 text-right font-mono">
                  <span 
                    class="font-semibold text-xs"
                    :class="menu.sellingPrice - menu.costPrice > 0 ? 'text-emerald-600' : 'text-slate-400'"
                  >
                    +Rp {{ (menu.sellingPrice - menu.costPrice).toLocaleString('id-ID') }}
                  </span>
                </td>

                <!-- Actions -->
                <td class="py-2.5 px-3 text-center">
                  <div class="flex items-center justify-center gap-1">
                    <button
                      @click="startEdit(menu)"
                      class="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                      title="Edit Menu"
                    >
                      <Edit3 class="w-3.5 h-3.5" />
                    </button>
                    <button
                      @click="deleteMenu(menu.id)"
                      class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                      title="Hapus Menu"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="filteredMenus.length === 0">
                <td colspan="7" class="py-8 text-center text-slate-400 text-xs">
                  Tidak ada menu yang sesuai dengan pencarian atau filter.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

      <!-- Footer -->
      <div class="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
        <button
          @click="emit('close')"
          class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs sm:text-sm font-semibold transition"
        >
          Selesai
        </button>
      </div>

    </div>
  </div>
</template>
