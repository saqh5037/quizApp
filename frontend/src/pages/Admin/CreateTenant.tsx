import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, Save, X, Loader2 } from 'lucide-react';
import api from '../../services/api';

interface TenantFormData {
  name: string;
  type: 'internal' | 'client' | 'partner';
  settings: {
    default: boolean;
    maxUsers?: number;
    features?: string[];
  };
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
  };
}

const CreateTenant: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    type: 'client',
    settings: {
      default: false,
      maxUsers: 100,
      features: ['quizzes', 'videos', 'classrooms']
    },
    branding: {
      primaryColor: '#3B82F6',
      secondaryColor: '#60A5FA'
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (loading) return;
    
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/tenants', formData);
      
      if (response.data.success) {
        navigate('/admin/tenants', {
          state: { message: 'Tenant created successfully' }
        });
      } else {
        // Handle case where success is false
        setError(response.data.error || response.data.message || 'Failed to create tenant');
      }
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      
      // Better error handling
      if (error.response?.data) {
        const errorData = error.response.data;
        setError(errorData.error || errorData.message || 'Failed to create tenant');
      } else if (error.message) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (path: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const availableFeatures = [
    { id: 'quizzes', label: 'Quiz Management' },
    { id: 'videos', label: 'Video Library' },
    { id: 'classrooms', label: 'Classroom Management' },
    { id: 'certificates', label: 'Certificate Generation' },
    { id: 'ai', label: 'AI Integration' },
    { id: 'analytics', label: 'Advanced Analytics' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/admin/tenants"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link to="/admin" className="text-gray-500 hover:text-gray-700">
                Admin
              </Link>
              <span className="text-gray-500">/</span>
              <Link to="/admin/tenants" className="text-gray-500 hover:text-gray-700">
                Tenants
              </Link>
              <span className="text-gray-500">/</span>
              <span className="text-gray-900 dark:text-white">Create</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Create New Tenant
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Set up a new organizational tenant with custom settings and branding
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-lg mb-6 flex items-center gap-2">
            <X className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tenant Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder="Enter tenant name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  This will be used to identify the organization
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tenant Type *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => updateFormData('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="client">Client Organization</option>
                  <option value="internal">Internal Organization</option>
                  <option value="partner">Partner Organization</option>
                </select>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Defines the tenant's relationship type
                </p>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Settings & Features
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum Users
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={formData.settings.maxUsers || ''}
                  onChange={(e) => updateFormData('settings.maxUsers', parseInt(e.target.value) || undefined)}
                  placeholder="100"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Leave empty for unlimited users
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Tenant
                </label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.settings.default}
                    onChange={(e) => updateFormData('settings.default', e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600"
                  />
                  <label className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    Set as default tenant for new users
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Available Features
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableFeatures.map((feature) => (
                  <label key={feature.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.settings.features?.includes(feature.id) || false}
                      onChange={(e) => {
                        const currentFeatures = formData.settings.features || [];
                        if (e.target.checked) {
                          updateFormData('settings.features', [...currentFeatures, feature.id]);
                        } else {
                          updateFormData('settings.features', currentFeatures.filter(f => f !== feature.id));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600"
                    />
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                      {feature.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Branding & Appearance
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Primary Color
                </label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={formData.branding.primaryColor}
                    onChange={(e) => updateFormData('branding.primaryColor', e.target.value)}
                    className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.branding.primaryColor}
                    onChange={(e) => updateFormData('branding.primaryColor', e.target.value)}
                    placeholder="#3B82F6"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Secondary Color
                </label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={formData.branding.secondaryColor}
                    onChange={(e) => updateFormData('branding.secondaryColor', e.target.value)}
                    className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.branding.secondaryColor}
                    onChange={(e) => updateFormData('branding.secondaryColor', e.target.value)}
                    placeholder="#60A5FA"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Logo URL (Optional)
              </label>
              <input
                type="url"
                value={formData.branding.logo || ''}
                onChange={(e) => updateFormData('branding.logo', e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                URL to the tenant's logo image
              </p>
            </div>

            {/* Color Preview */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color Preview
              </label>
              <div className="flex gap-4">
                <div
                  className="w-16 h-16 rounded-lg border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: formData.branding.primaryColor }}
                  title="Primary Color"
                ></div>
                <div
                  className="w-16 h-16 rounded-lg border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: formData.branding.secondaryColor }}
                  title="Secondary Color"
                ></div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Link
              to="/admin/tenants"
              className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {loading ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTenant;