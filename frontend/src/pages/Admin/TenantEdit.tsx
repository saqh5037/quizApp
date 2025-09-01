import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Building2, 
  ChevronLeft,
  Save,
  X,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';

interface TenantData {
  id: number;
  name: string;
  slug: string;
  domain?: string;
  subdomain?: string;
  type: 'internal' | 'client' | 'partner';
  subscription_plan: 'free' | 'basic' | 'premium' | 'enterprise';
  subscription_expires_at?: string;
  settings: {
    maxUsers?: number;
    maxStorage?: number;
    aiCreditsMonthly?: number;
    features?: string[];
    allowPublicQuizzes?: boolean;
    allowVideoUpload?: boolean;
  };
  branding: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
  };
  is_active: boolean;
}

const TenantEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<Partial<TenantData>>({
    name: '',
    slug: '',
    domain: '',
    subdomain: '',
    type: 'client',
    subscription_plan: 'free',
    subscription_expires_at: '',
    settings: {
      maxUsers: 5,
      maxStorage: 100,
      aiCreditsMonthly: 10,
      features: ['quizzes', 'videos', 'manuals'],
      allowPublicQuizzes: true,
      allowVideoUpload: true
    },
    branding: {
      primaryColor: '#3B82F6',
      secondaryColor: '#60A5FA'
    },
    is_active: true
  });

  useEffect(() => {
    fetchTenant();
  }, [id]);

  const fetchTenant = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/tenants/${id}`);
      
      if (response && response.success) {
        const tenant = response.data;
        setFormData({
          ...tenant,
          subscription_expires_at: tenant.subscription_expires_at 
            ? new Date(tenant.subscription_expires_at).toISOString().split('T')[0]
            : ''
        });
      } else {
        setError('Failed to load tenant details');
      }
    } catch (error: any) {
      console.error('Error fetching tenant:', error);
      setError('Failed to load tenant details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSettingsChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value
      }
    }));
  };

  const handleBrandingChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      branding: {
        ...prev.branding,
        [field]: value
      }
    }));
  };

  const handleFeatureToggle = (feature: string) => {
    const currentFeatures = formData.settings?.features || [];
    const newFeatures = currentFeatures.includes(feature)
      ? currentFeatures.filter(f => f !== feature)
      : [...currentFeatures, feature];
    
    handleSettingsChange('features', newFeatures);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        subscription_expires_at: formData.subscription_expires_at 
          ? new Date(formData.subscription_expires_at).toISOString()
          : null
      };

      const response = await api.put(`/admin/tenants/${id}`, submitData);
      
      if (response && response.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate(`/admin/tenants/${id}`);
        }, 1500);
      } else {
        setError('Failed to update tenant');
      }
    } catch (error: any) {
      console.error('Error updating tenant:', error);
      setError(error.response?.data?.error || 'Failed to update tenant');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <Link to="/admin" className="hover:text-gray-700 dark:hover:text-gray-300">
              Admin
            </Link>
            <span>/</span>
            <Link to="/admin/tenants" className="hover:text-gray-700 dark:hover:text-gray-300">
              Tenants
            </Link>
            <span>/</span>
            <Link to={`/admin/tenants/${id}`} className="hover:text-gray-700 dark:hover:text-gray-300">
              {formData.name}
            </Link>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-300">Edit</span>
          </div>
          
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Edit Tenant
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  Update tenant configuration and settings
                </p>
              </div>
            </div>
            
            <Link to={`/admin/tenants/${id}`}>
              <button className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                <X className="h-4 w-4" />
                Cancel
              </button>
            </Link>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>Tenant updated successfully! Redirecting...</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tenant Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter tenant name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug || ''}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="tenant-slug"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Domain
                </label>
                <input
                  type="text"
                  value={formData.domain || ''}
                  onChange={(e) => handleInputChange('domain', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subdomain
                </label>
                <input
                  type="text"
                  value={formData.subdomain || ''}
                  onChange={(e) => handleInputChange('subdomain', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="tenant"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <select
                  value={formData.type || 'client'}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="client">Client</option>
                  <option value="partner">Partner</option>
                  <option value="internal">Internal</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active || false}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Active
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Subscription
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subscription Plan
                </label>
                <select
                  value={formData.subscription_plan || 'free'}
                  onChange={(e) => handleInputChange('subscription_plan', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expires At
                </label>
                <input
                  type="date"
                  value={formData.subscription_expires_at || ''}
                  onChange={(e) => handleInputChange('subscription_expires_at', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Settings & Limits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Users
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.settings?.maxUsers || 0}
                  onChange={(e) => handleSettingsChange('maxUsers', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0 = unlimited"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Storage (MB)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.settings?.maxStorage || 0}
                  onChange={(e) => handleSettingsChange('maxStorage', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0 = unlimited"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  AI Credits Monthly
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.settings?.aiCreditsMonthly || 0}
                  onChange={(e) => handleSettingsChange('aiCreditsMonthly', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0 = unlimited"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Features</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {['quizzes', 'videos', 'manuals', 'classrooms', 'certificates', 'analytics'].map(feature => (
                  <label key={feature} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.settings?.features?.includes(feature) || false}
                      onChange={() => handleFeatureToggle(feature)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {feature}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="mt-4 space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Permissions</h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.settings?.allowPublicQuizzes || false}
                    onChange={(e) => handleSettingsChange('allowPublicQuizzes', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Allow Public Quizzes
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.settings?.allowVideoUpload || false}
                    onChange={(e) => handleSettingsChange('allowVideoUpload', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Allow Video Upload
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Branding
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Primary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.branding?.primaryColor || '#3B82F6'}
                    onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                    className="w-16 h-10 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                  <input
                    type="text"
                    value={formData.branding?.primaryColor || '#3B82F6'}
                    onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Secondary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.branding?.secondaryColor || '#60A5FA'}
                    onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
                    className="w-16 h-10 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                  <input
                    type="text"
                    value={formData.branding?.secondaryColor || '#60A5FA'}
                    onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link to={`/admin/tenants/${id}`}>
              <button
                type="button"
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TenantEdit;