/**
 * AristoTest Frontend — Root component.
 *
 * Routes are lazy-loaded to keep the initial bundle small. The router is
 * wrapped in a global ErrorBoundary so any render-time error renders a
 * fallback instead of crashing the whole app.
 */

import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { TenantProvider } from './contexts/TenantContext';
import './i18n';
import ErrorBoundary from './components/ErrorBoundary';
import PageLoader from './components/PageLoader';
import PrivateRoute from './components/PrivateRoute';

// Layout & critical-path pages (loaded eagerly — small and always needed)
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';

// Lazy-loaded routes (one chunk per page, grouped by feature via webpackChunkName-style hints)
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Quiz creation / management
const Quizzes = lazy(() => import('./pages/Quizzes'));
const QuizDetail = lazy(() => import('./pages/QuizDetail'));
const CreateQuiz = lazy(() => import('./pages/CreateQuiz'));
const EditQuiz = lazy(() => import('./pages/EditQuiz'));
const GenerateQuizWizard = lazy(() => import('./pages/GenerateQuizWizard'));
const QuizAnalytics = lazy(() => import('./pages/QuizAnalytics'));

// Live sessions & play
const HostSession = lazy(() => import('./pages/HostSession'));
const JoinSession = lazy(() => import('./pages/JoinSession'));
const PlayQuiz = lazy(() => import('./pages/PlayQuiz'));
const SessionResults = lazy(() => import('./pages/SessionResults'));
const Sessions = lazy(() => import('./pages/Sessions'));

// Results
const Results = lazy(() => import('./pages/Results'));
const PublicResults = lazy(() => import('./pages/PublicResults'));
const ResultDetail = lazy(() => import('./pages/ResultDetail'));

// Profile, docs, public
const Profile = lazy(() => import('./pages/Profile'));
const Documentation = lazy(() => import('./pages/Documentation'));
const PublicQuizAccess = lazy(() => import('./pages/PublicQuizAccess'));
const PublicQuizTake = lazy(() => import('./pages/PublicQuizTake'));

// Videos
const Videos = lazy(() => import('./pages/Videos'));
const VideoUpload = lazy(() => import('./pages/VideoUpload'));
const VideoDetail = lazy(() => import('./pages/VideoDetail'));
const VideoEdit = lazy(() => import('./pages/VideoEdit'));
const VideoPlayerPage = lazy(() => import('./pages/VideoPlayer'));
const InteractiveVideoManagement = lazy(() => import('./pages/Videos/InteractiveVideoManagement'));
const PublicVideoPlayer = lazy(() => import('./pages/Videos/PublicVideoPlayer'));
const PublicInteractiveVideoEnhanced = lazy(() => import('./pages/Videos/PublicInteractiveVideoEnhanced'));

// Classrooms
const ClassroomsIndex = lazy(() => import('./pages/Classrooms/ClassroomsIndex'));
const NewClassroom = lazy(() => import('./pages/Classrooms/NewClassroom'));
const ClassroomDetail = lazy(() => import('./pages/Classrooms/ClassroomDetail'));
const ClassroomEdit = lazy(() => import('./pages/Classrooms/ClassroomEdit'));

// Manuals & resources
const ManualsIndex = lazy(() => import('./pages/Manuals/ManualsIndex'));
const UploadManual = lazy(() => import('./pages/Manuals/UploadManual'));
const ManualDetail = lazy(() => import('./pages/Manuals/ManualDetail'));
const ManualEdit = lazy(() => import('./pages/Manuals/ManualEdit'));
const ManualChat = lazy(() => import('./pages/Manuals/ManualChat'));
const GenerateQuizImproved = lazy(() => import('./pages/Manuals/GenerateQuizImproved'));
const TenantSettings = lazy(() => import('./pages/Tenant/TenantSettings'));
const GenerateSummary = lazy(() => import('./pages/Manuals/GenerateSummary'));
const ManualResources = lazy(() => import('./pages/Manuals/ManualResources'));
const ResourceViewer = lazy(() => import('./pages/Manuals/ResourceViewer'));
const ViewSummaryGlass = lazy(() => import('./pages/Manuals/ViewSummaryGlass'));

// Admin
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const TenantManagement = lazy(() => import('./pages/Admin/TenantManagement'));
const TenantDetail = lazy(() => import('./pages/Admin/TenantDetail'));
const TenantEdit = lazy(() => import('./pages/Admin/TenantEdit'));
const TenantUsers = lazy(() => import('./pages/Admin/TenantUsers'));
const CreateTenant = lazy(() => import('./pages/Admin/CreateTenant'));
const CreateUser = lazy(() => import('./pages/Admin/CreateUser'));
const UserManagement = lazy(() => import('./pages/Admin/UserManagement'));
const SystemActivity = lazy(() => import('./pages/Admin/SystemActivity'));
const ClassroomManagement = lazy(() => import('./pages/Admin/ClassroomManagement'));
const CategoryManagement = lazy(() => import('./pages/Admin/CategoryManagement'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

// Helper to wrap a lazy component in the shared Suspense fallback.
const suspense = (node: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{node}</Suspense>
);

const router = createBrowserRouter(
  [
    { path: '/login', element: <Login /> },
    { path: '/register', element: suspense(<Register />) },
    { path: '/join', element: suspense(<JoinSession />) },
    { path: '/play', element: suspense(<PlayQuiz />) },
    { path: '/sessions/:id/results', element: suspense(<SessionResults />) },
    { path: '/quiz/:id/public', element: suspense(<PublicQuizAccess />) },
    { path: '/quiz/:id/take', element: suspense(<PublicQuizTake />) },
    { path: '/quiz/:id/take/:sessionId', element: suspense(<PublicQuizTake />) },
    {
      path: '/',
      element: (
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      ),
      children: [
        { index: true, element: <Navigate to="/dashboard" /> },
        { path: 'dashboard', element: suspense(<Dashboard />) },
        { path: 'quizzes', element: suspense(<Quizzes />) },
        { path: 'quizzes/:id', element: suspense(<QuizDetail />) },
        { path: 'quizzes/create', element: suspense(<CreateQuiz />) },
        { path: 'quizzes/generate', element: suspense(<GenerateQuizWizard />) },
        { path: 'quizzes/:id/analytics', element: suspense(<QuizAnalytics />) },
        { path: 'quizzes/:id/edit', element: suspense(<EditQuiz />) },
        { path: 'videos', element: suspense(<Videos />) },
        { path: 'videos/upload', element: suspense(<VideoUpload />) },
        { path: 'videos/:id', element: suspense(<VideoDetail />) },
        { path: 'videos/:id/edit', element: suspense(<VideoEdit />) },
        { path: 'videos/:id/play', element: suspense(<VideoPlayerPage />) },
        { path: 'videos/:id/interactive', element: suspense(<InteractiveVideoManagement />) },
        { path: 'videos/:id/public', element: suspense(<PublicVideoPlayer />) },
        { path: 'videos/:id/public-interactive', element: suspense(<PublicInteractiveVideoEnhanced />) },
        { path: 'classrooms', element: suspense(<ClassroomsIndex />) },
        { path: 'classrooms/new', element: suspense(<NewClassroom />) },
        { path: 'classrooms/:id', element: suspense(<ClassroomDetail />) },
        { path: 'classrooms/:id/edit', element: suspense(<ClassroomEdit />) },
        { path: 'manuals', element: suspense(<ManualsIndex />) },
        { path: 'manuals/upload', element: suspense(<UploadManual />) },
        { path: 'manuals/:id', element: suspense(<ManualDetail />) },
        { path: 'manuals/:id/edit', element: suspense(<ManualEdit />) },
        { path: 'manuals/:manualId/chat', element: suspense(<ManualChat />) },
        { path: 'manuals/:manualId/generate-quiz', element: suspense(<GenerateQuizImproved />) },
        { path: 'manuals/:manualId/generate-summary', element: suspense(<GenerateSummary />) },
        { path: 'manuals/:manualId/resources', element: suspense(<ManualResources />) },
        { path: 'resources/:resourceType/:resourceId', element: suspense(<ResourceViewer />) },
        { path: 'resources/summary/:summaryId', element: suspense(<ViewSummaryGlass />) },
        { path: 'sessions', element: suspense(<Sessions />) },
        { path: 'sessions/host', element: suspense(<HostSession />) },
        { path: 'results', element: suspense(<Results />) },
        { path: 'results/:sessionId', element: suspense(<Results />) },
        { path: 'public-results', element: suspense(<PublicResults />) },
        { path: 'public-results/:quizId', element: suspense(<PublicResults />) },
        { path: 'results/detail/:resultType/:id', element: suspense(<ResultDetail />) },
        { path: 'profile', element: suspense(<Profile />) },
        { path: 'tenant-settings', element: suspense(<TenantSettings />) },
        { path: 'docs', element: suspense(<Documentation />) },
        // Admin routes (Super Admin only)
        { path: 'admin', element: suspense(<AdminDashboard />) },
        { path: 'admin/tenants', element: suspense(<TenantManagement />) },
        { path: 'admin/tenants/:id', element: suspense(<TenantDetail />) },
        { path: 'admin/tenants/:id/edit', element: suspense(<TenantEdit />) },
        { path: 'admin/tenants/:id/users', element: suspense(<TenantUsers />) },
        { path: 'admin/tenants/create', element: suspense(<CreateTenant />) },
        { path: 'admin/users', element: suspense(<UserManagement />) },
        { path: 'admin/users/create', element: suspense(<CreateUser />) },
        { path: 'admin/system/activity', element: suspense(<SystemActivity />) },
        { path: 'admin/classrooms', element: suspense(<ClassroomManagement />) },
        { path: 'admin/categories', element: suspense(<CategoryManagement />) },
      ],
    },
    { path: '*', element: suspense(<NotFound />) },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  }
);

function App() {
  return (
    <ErrorBoundary>
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
                  primary: '#2E7D32',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#C62828',
                  secondary: '#fff',
                },
              },
            }}
          />

          <RouterProvider router={router} />
        </TenantProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
