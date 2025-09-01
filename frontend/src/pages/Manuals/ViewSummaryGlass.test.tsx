import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ViewSummaryGlass from './ViewSummaryGlass';

// Mock de useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ summaryId: '1' }),
    useNavigate: () => vi.fn()
  };
});

// Mock del servicio
vi.mock('../../services/educationalResourcesService', () => ({
  default: {
    getResource: vi.fn().mockResolvedValue({
      id: 1,
      title: 'Test Summary',
      content: '# Test Content\n\nThis is a test summary with **bold** text.',
      status: 'ready',
      word_count: 100,
      summary_type: 'comprehensive',
      is_public: true,
      created_at: '2024-01-01T00:00:00Z',
      manual: { id: 1, title: 'Test Manual' },
      user: { firstName: 'John', lastName: 'Doe' }
    })
  }
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderComponent = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ViewSummaryGlass />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ViewSummaryGlass', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    renderComponent();
    expect(screen.getByText(/Cargando resumen/i)).toBeInTheDocument();
  });

  it('renders summary content after loading', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Test Summary')).toBeInTheDocument();
    });
    expect(screen.getByText(/Test Content/)).toBeInTheDocument();
  });

  it('toggles dark mode', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Test Summary')).toBeInTheDocument();
    });
    
    const darkModeButton = screen.getByLabelText(/Modo oscuro/i);
    fireEvent.click(darkModeButton);
    
    // Verificar que se aplica la clase de dark mode
    const container = screen.getByTestId('summary-container');
    expect(container).toHaveClass('bg-gray-900');
  });

  it('changes font size', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Test Summary')).toBeInTheDocument();
    });
    
    const increaseFontButton = screen.getByLabelText(/Aumentar tamaño/i);
    fireEvent.click(increaseFontButton);
    
    const contentDiv = screen.getByTestId('summary-content');
    expect(contentDiv).toHaveStyle({ fontSize: '18px' });
  });

  it('toggles focus mode', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Test Summary')).toBeInTheDocument();
    });
    
    const focusModeButton = screen.getByLabelText(/Modo enfoque/i);
    fireEvent.click(focusModeButton);
    
    // Verificar que elementos de distracción están ocultos
    expect(screen.queryByTestId('header-info')).not.toBeInTheDocument();
  });

  it('displays word count and reading time', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Test Summary')).toBeInTheDocument();
    });
    
    expect(screen.getByText(/100 palabras/i)).toBeInTheDocument();
    expect(screen.getByText(/~1 min/i)).toBeInTheDocument();
  });

  it('handles error state', async () => {
    const educationalResourcesService = await import('../../services/educationalResourcesService');
    educationalResourcesService.default.getResource = vi.fn().mockRejectedValue(new Error('Failed to load'));
    
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/Error al cargar el resumen/i)).toBeInTheDocument();
    });
  });
});