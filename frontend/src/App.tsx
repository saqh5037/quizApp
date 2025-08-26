/**
 * AristoTest Frontend
 * 
 * Main React application component that sets up routing,
 * state management, and global providers.
 * 
 * @author Samuel Quiroz
 * @version 1.0.0
 */

import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { TenantProvider } from './contexts/TenantContext';
import PrivateRoute from './components/PrivateRoute';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Quizzes from './pages/Quizzes';
import QuizDetail from './pages/QuizDetail';
import CreateQuiz from './pages/CreateQuiz';
import EditQuiz from './pages/EditQuiz';
import HostSession from './pages/HostSession';
import JoinSession from './pages/JoinSession';
import PlayQuiz from './pages/PlayQuiz';
import SessionResults from './pages/SessionResults';
import Sessions from './pages/Sessions';
import Results from './pages/Results';
import PublicResults from './pages/PublicResults';
import ResultDetail from './pages/ResultDetail';
import Profile from './pages/Profile';
import Documentation from './pages/Documentation';
import PublicQuizAccess from './pages/PublicQuizAccess';
import PublicQuizTake from './pages/PublicQuizTake';
import Videos from './pages/Videos';
import VideoUpload from './pages/VideoUpload';
import VideoDetail from './pages/VideoDetail';
import VideoEdit from './pages/VideoEdit';
import VideoPlayerPage from './pages/VideoPlayer';
import InteractiveVideoManagement from './pages/Videos/InteractiveVideoManagement';
import ClassroomsIndex from './pages/Classrooms/ClassroomsIndex';
import NewClassroom from './pages/Classrooms/NewClassroom';
import ClassroomDetail from './pages/Classrooms/ClassroomDetail';
import ClassroomEdit from './pages/Classrooms/ClassroomEdit';
import ManualsIndex from './pages/Manuals/ManualsIndex';
import UploadManual from './pages/Manuals/UploadManual';
import ManualDetail from './pages/Manuals/ManualDetail';
import ManualEdit from './pages/Manuals/ManualEdit';
import ManualChat from './pages/Manuals/ManualChat';
import GenerateQuiz from './pages/Manuals/GenerateQuiz';
import GenerateQuizImproved from './pages/Manuals/GenerateQuizImproved';
import TenantSettings from './pages/Tenant/TenantSettings';
import GenerateSummary from './pages/Manuals/GenerateSummary';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Create router with future flags enabled
const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/join',
    element: <JoinSession />,
  },
  {
    path: '/play',
    element: <PlayQuiz />,
  },
  {
    path: '/sessions/:id/results',
    element: <SessionResults />,
  },
  {
    path: '/quiz/:id/public',
    element: <PublicQuizAccess />,
  },
  {
    path: '/quiz/:id/take',
    element: <PublicQuizTake />,
  },
  {
    path: '/quiz/:id/take/:sessionId',
    element: <PublicQuizTake />,
  },
  {
    path: '/',
    element: (
      <PrivateRoute>
        <MainLayout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'quizzes',
        element: <Quizzes />,
      },
      {
        path: 'quizzes/:id',
        element: <QuizDetail />,
      },
      {
        path: 'quizzes/create',
        element: <CreateQuiz />,
      },
      {
        path: 'quizzes/:id/edit',
        element: <EditQuiz />,
      },
      {
        path: 'videos',
        element: <Videos />,
      },
      {
        path: 'videos/upload',
        element: <VideoUpload />,
      },
      {
        path: 'videos/:id',
        element: <VideoDetail />,
      },
      {
        path: 'videos/:id/edit',
        element: <VideoEdit />,
      },
      {
        path: 'videos/:id/play',
        element: <VideoPlayerPage />,
      },
      {
        path: 'videos/:id/interactive',
        element: <InteractiveVideoManagement />,
      },
      {
        path: 'classrooms',
        element: <ClassroomsIndex />,
      },
      {
        path: 'classrooms/new',
        element: <NewClassroom />,
      },
      {
        path: 'classrooms/:id',
        element: <ClassroomDetail />,
      },
      {
        path: 'classrooms/:id/edit',
        element: <ClassroomEdit />,
      },
      {
        path: 'manuals',
        element: <ManualsIndex />,
      },
      {
        path: 'manuals/upload',
        element: <UploadManual />,
      },
      {
        path: 'manuals/:id',
        element: <ManualDetail />,
      },
      {
        path: 'manuals/:id/edit',
        element: <ManualEdit />,
      },
      {
        path: 'manuals/:manualId/chat',
        element: <ManualChat />,
      },
      {
        path: 'manuals/:manualId/generate-quiz',
        element: <GenerateQuizImproved />,
      },
      {
        path: 'manuals/:manualId/generate-summary',
        element: <GenerateSummary />,
      },
      {
        path: 'sessions',
        element: <Sessions />,
      },
      {
        path: 'sessions/host',
        element: <HostSession />,
      },
      {
        path: 'results',
        element: <Results />,
      },
      {
        path: 'results/:sessionId',
        element: <Results />,
      },
      {
        path: 'public-results',
        element: <PublicResults />,
      },
      {
        path: 'public-results/:quizId',
        element: <PublicResults />,
      },
      {
        path: 'results/detail/:id',
        element: <ResultDetail />,
      },
      {
        path: 'profile',
        element: <Profile />,
      },
      {
        path: 'tenant-settings',
        element: <TenantSettings />,
      },
      {
        path: 'docs',
        element: <Documentation />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#212121',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            },
            success: {
              iconTheme: {
                primary: '#4CAF50',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#F44336',
                secondary: '#fff',
              },
            },
          }}
        />
        
        <RouterProvider router={router} />
      </TenantProvider>
    </QueryClientProvider>
  );
}

export default App;