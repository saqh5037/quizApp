import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Save, ArrowLeft, Users, Calendar, Check } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';
import apiConfig from '../../config/api.config';
import toast from 'react-hot-toast';

interface TenantData {
  id: number;
  name: string;
  slug: string;
  type: string;
  is_active: boolean;
  settings?: any;
  branding?: any;
  created_at: string;
  updated_at: string;
}

const TenantSettings: React.FC = () => {
  const navigate = useNavigate();
  const { accessToken: token, user } = useAuthStore();
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    primaryColor: '#0066CC',
    secondaryColor: '#00A3FF',
    logoUrl: ''
  });

  useEffect(() => {
    fetchTenantData();
  }, []);

  const fetchTenantData = async () => {
    try {
      const response = await axios.get(`${apiConfig.baseURL}/tenants/current`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const tenantData = response.data.data;
      setTenant(tenantData);
      setFormData({
        name: tenantData.name || '',
        primaryColor: tenantData.branding?.primaryColor || '#0066CC',
        secondaryColor: tenantData.branding?.secondaryColor || '#00A3FF',
        logoUrl: tenantData.branding?.logo || ''
      });
    } catch (error: any) {
      console.error('Error fetching tenant:', error);
      toast.error('Error al cargar información del tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await axios.put(
        `${apiConfig.baseURL}/tenants/current`,
        {
          name: formData.name,
          branding: {
            primaryColor: formData.primaryColor,
            secondaryColor: formData.secondaryColor,
            logo: formData.logoUrl
          }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      toast.success('Configuración actualizada exitosamente');
      setTenant(response.data.data);
    } catch (error: any) {
      console.error('Error updating tenant:', error);
      toast.error(error.response?.data?.error || 'Error al actualizar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Solo admin puede ver esta página
  if (user?.role !== 'admin' && user?.role !== 'tenant_admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">Solo los administradores pueden acceder a esta página</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Building2 className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-800">Configuración de la Organización</h1>
            </div>
            {tenant?.is_active && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center">
                <Check className="w-4 h-4 mr-1" />
                Activo
              </span>
            )}
          </div>
        </div>

        {/* Tenant Info Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID de Organización
              </label>
              <p className="text-gray-900 font-mono bg-gray-50 px-3 py-2 rounded">
                {tenant?.id}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código Único
              </label>
              <p className="text-gray-900 font-mono bg-gray-50 px-3 py-2 rounded">
                {tenant?.slug}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Organización
              </label>
              <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded capitalize">
                {tenant?.type === 'internal' ? 'Interna' : 'Cliente'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Creación
              </label>
              <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded">
                {tenant?.created_at ? new Date(tenant.created_at).toLocaleDateString('es-ES') : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Personalización</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Organización
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nombre de tu organización"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color Primario
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="h-10 w-20"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono"
                    placeholder="#0066CC"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color Secundario
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                    className="h-10 w-20"
                  />
                  <input
                    type="text"
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono"
                    placeholder="#00A3FF"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL del Logo (opcional)
              </label>
              <input
                type="url"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://ejemplo.com/logo.png"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TenantSettings;