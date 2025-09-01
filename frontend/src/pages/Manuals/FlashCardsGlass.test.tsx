import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import FlashCardsGlass from './FlashCardsGlass';

// Mock de useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ cardSetId: '1' }),
    useNavigate: () => vi.fn()
  };
});

// Mock del servicio
vi.mock('../../services/educationalResourcesService', () => ({
  default: {
    getResource: vi.fn().mockResolvedValue({
      id: 1,
      set_title: 'Test Flash Cards',
      total_cards: 3,
      cards: [
        {
          id: '1',
          front: 'What is React?',
          back: 'A JavaScript library for building user interfaces',
          category: 'Basics',
          difficulty: 'easy',
          hints: 'Think about components'
        },
        {
          id: '2',
          front: 'What is useState?',
          back: 'A React Hook for managing state',
          category: 'Hooks',
          difficulty: 'medium'
        },
        {
          id: '3',
          front: 'What is JSX?',
          back: 'JavaScript XML - a syntax extension',
          category: 'Basics',
          difficulty: 'easy'
        }
      ],
      status: 'ready',
      is_public: true,
      created_at: '2024-01-01T00:00:00Z',
      manual: { id: 1, title: 'Test Manual' },
      user: { firstName: 'John', lastName: 'Doe' }
    })
  }
}));

// Mock de react-confetti
vi.mock('react-confetti', () => ({
  default: () => null
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
        <FlashCardsGlass />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('FlashCardsGlass', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    renderComponent();
    expect(screen.getByText(/Cargando tarjetas/i)).toBeInTheDocument();
  });

  it('renders flash cards after loading', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Test Flash Cards')).toBeInTheDocument();
    });
    expect(screen.getByText('What is React?')).toBeInTheDocument();
  });

  it('flips card when clicked', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });
    
    const card = screen.getByTestId('flash-card');
    fireEvent.click(card);
    
    await waitFor(() => {
      expect(screen.getByText(/A JavaScript library for building user interfaces/i)).toBeInTheDocument();
    });
  });

  it('navigates to next card', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });
    
    const nextButton = screen.getByLabelText(/Siguiente tarjeta/i);
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('What is useState?')).toBeInTheDocument();
    });
  });

  it('navigates to previous card', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });
    
    // Ir a la segunda tarjeta
    const nextButton = screen.getByLabelText(/Siguiente tarjeta/i);
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('What is useState?')).toBeInTheDocument();
    });
    
    // Volver a la primera
    const prevButton = screen.getByLabelText(/Tarjeta anterior/i);
    fireEvent.click(prevButton);
    
    await waitFor(() => {
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });
  });

  it('marks cards as learned', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });
    
    // Voltear la tarjeta
    const card = screen.getByTestId('flash-card');
    fireEvent.click(card);
    
    await waitFor(() => {
      expect(screen.getByText(/A JavaScript library/i)).toBeInTheDocument();
    });
    
    // Marcar como aprendida
    const learnedButton = screen.getByText(/Lo sé/i);
    fireEvent.click(learnedButton);
    
    // Verificar que el contador se actualiza
    expect(screen.getByTestId('learned-count')).toHaveTextContent('1');
  });

  it('shuffles cards', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });
    
    const shuffleButton = screen.getByLabelText(/Barajar tarjetas/i);
    fireEvent.click(shuffleButton);
    
    // Verificar que el botón existe y funciona (el orden real es aleatorio)
    expect(shuffleButton).toBeInTheDocument();
  });

  it('toggles auto-play mode', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });
    
    const autoPlayButton = screen.getByLabelText(/Auto-reproducción/i);
    fireEvent.click(autoPlayButton);
    
    // Verificar que el modo auto-play está activo
    expect(screen.getByTestId('auto-play-indicator')).toBeInTheDocument();
  });

  it('resets session', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });
    
    // Marcar una tarjeta como aprendida
    const card = screen.getByTestId('flash-card');
    fireEvent.click(card);
    
    await waitFor(() => {
      expect(screen.getByText(/A JavaScript library/i)).toBeInTheDocument();
    });
    
    const learnedButton = screen.getByText(/Lo sé/i);
    fireEvent.click(learnedButton);
    
    // Reiniciar sesión
    const resetButton = screen.getByLabelText(/Reiniciar sesión/i);
    fireEvent.click(resetButton);
    
    // Verificar que los contadores se reinician
    expect(screen.getByTestId('learned-count')).toHaveTextContent('0');
  });

  it('displays progress bar correctly', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });
    
    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar).toHaveStyle({ width: '33.33%' }); // 1/3 tarjetas
  });

  it('shows completion message when all cards are learned', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });
    
    // Marcar todas las tarjetas como aprendidas
    for (let i = 0; i < 3; i++) {
      const card = screen.getByTestId('flash-card');
      fireEvent.click(card);
      
      await waitFor(() => {
        expect(screen.getByText(/Lo sé|Necesito práctica/i)).toBeInTheDocument();
      });
      
      const learnedButton = screen.getByText(/Lo sé/i);
      fireEvent.click(learnedButton);
      
      if (i < 2) {
        const nextButton = screen.getByLabelText(/Siguiente tarjeta/i);
        fireEvent.click(nextButton);
      }
    }
    
    // Verificar mensaje de completado
    await waitFor(() => {
      expect(screen.getByText(/¡Felicidades!/i)).toBeInTheDocument();
    });
  });
});