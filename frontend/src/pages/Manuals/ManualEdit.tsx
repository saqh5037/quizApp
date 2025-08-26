import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  FileText,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { apiGet, apiPut } from '../../utils/api.utils';
import toast from 'react-hot-toast';

interface Manual {
  id: number;
  title: string;
  description?: string;
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  userId: number;
  tenantId: number;
  status: string;
  createdAt: string;
}

const ManualEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hasInitialized, setHasInitialized] = useState(false);

  // Fetch manual data
  const { data: manual, isLoading, isError, error } = useQuery({
    queryKey: ['manual', id],
    queryFn: async () => {
      const response = await apiGet(`/manuals/${id}`);
      return response.data;
    },
    enabled: !!id
  });

  // Initialize form when data loads
  React.useEffect(() => {
    if (manual && !hasInitialized) {
      setTitle(manual.title || '');
      setDescription(manual.description || '');
      setHasInitialized(true);
    }
  }, [manual, hasInitialized]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { title: string; description: string }) => {
      return await apiPut(`/manuals/${id}`, data);
    },
    onSuccess: () => {
      toast.success('Manual actualizado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['manual', id] });
      queryClient.invalidateQueries({ queryKey: ['manuals'] });
      navigate(`/manuals/${id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al actualizar el manual');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('El título es requerido');
      return;
    }
    updateMutation.mutate({ 
      title: title.trim(), 
      description: description.trim() 
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando manual...</p>
        </div>
      </div>
    );
  }

  if (isError || !manual) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar el manual</h2>
          <p className="text-gray-600 mb-4">
            {error?.message || 'No se pudo cargar el manual solicitado'}
          </p>
          <button
            onClick={() => navigate('/manuals')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
          >
            Volver a Manuales
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/manuals/${id}`)}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Volver al Manual
          </button>
          
          <div className="flex items-center mb-4">
            <FileText className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">Editar Manual</h1>
          </div>
        </div>

        {/* Edit Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Título del Manual *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ingrese el título del manual"
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ingrese una descripción opcional del manual"
              />
            </div>

            {/* File Info (Read-only) */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Información del Archivo</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Archivo Original:</span> {manual.originalName}
                </div>
                <div>
                  <span className="font-medium">Tipo:</span> {manual.mimeType}
                </div>
                <div>
                  <span className="font-medium">Tamaño:</span> {
                    manual.size < 1024 ? `${manual.size} Bytes` :
                    manual.size < 1024 * 1024 ? `${(manual.size / 1024).toFixed(2)} KB` :
                    `${(manual.size / (1024 * 1024)).toFixed(2)} MB`
                  }
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                * No es posible cambiar el archivo. Para usar un archivo diferente, cree un nuevo manual.
              </p>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate(`/manuals/${id}`)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending || !title.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2 rounded-lg flex items-center"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ManualEdit;