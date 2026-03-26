import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, Tag, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { buildApiUrl } from '../../config/api.config';

interface Category {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  is_default: boolean;
  order_position: number;
}

export default function CategoryManagement() {
  const { accessToken } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('#6366f1');
  const [saving, setSaving] = useState(false);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const fetchCategories = async () => {
    try {
      const response = await fetch(buildApiUrl('/categories'), { headers });
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      toast.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormDescription('');
    setFormColor('#6366f1');
    setShowModal(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || '');
    setFormColor(cat.color || '#6366f1');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    setSaving(true);
    try {
      const url = editingCategory
        ? buildApiUrl(`/categories/${editingCategory.id}`)
        : buildApiUrl('/categories');
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          color: formColor,
        }),
      });
      const data = await response.json();

      if (data.success) {
        toast.success(editingCategory ? 'Categoría actualizada' : 'Categoría creada');
        setShowModal(false);
        fetchCategories();
      } else {
        toast.error(data.error || 'Error al guardar');
      }
    } catch (error) {
      toast.error('Error al guardar categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`¿Eliminar la categoría "${cat.name}"?`)) return;
    try {
      const response = await fetch(buildApiUrl(`/categories/${cat.id}`), {
        method: 'DELETE',
        headers,
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Categoría eliminada');
        fetchCategories();
      } else {
        toast.error(data.error || 'Error al eliminar');
      }
    } catch (error) {
      toast.error('Error al eliminar categoría');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categorías de Evaluaciones</h1>
            <p className="text-gray-500 text-sm">Gestiona las categorías disponibles para tus evaluaciones</p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva Categoría
        </button>
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {categories.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Sin categorías</p>
            <p className="text-sm">Crea tu primera categoría para organizar tus evaluaciones</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Descripción</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-400">
                      <GripVertical className="w-4 h-4" />
                      <span className="text-sm">{cat.order_position}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color || '#6366f1' }}
                      />
                      <span className="font-medium text-gray-900">{cat.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {cat.description || '—'}
                  </td>
                  <td className="px-6 py-4">
                    {cat.is_default ? (
                      <span className="inline-flex px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700">
                        Default
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                        Custom
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Capacitación, Laboratorio, Sistemas..."
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Descripción opcional..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                  />
                  <span className="text-sm text-gray-500">{formColor}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editingCategory ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
