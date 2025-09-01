import React from 'react';
import { useParams } from 'react-router-dom';
import ViewSummaryGlass from './ViewSummaryGlass';
import StudyGuideGlass from './StudyGuideGlass';
import FlashCardsGlass from './FlashCardsGlass';

const ResourceViewer: React.FC = () => {
  const { resourceType, resourceId } = useParams<{ resourceType: string; resourceId: string }>();

  switch (resourceType) {
    case 'summary':
      return <ViewSummaryGlass />;
    case 'study_guide':
      return <StudyGuideGlass />;
    case 'flash_cards':
      return <FlashCardsGlass />;
    default:
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Tipo de recurso no válido</h2>
            <a 
              href="/manuals" 
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Volver a Manuales
            </a>
          </div>
        </div>
      );
  }
};

export default ResourceViewer;