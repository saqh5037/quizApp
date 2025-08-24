/**
 * AristoTest Theme Configuration
 * Sistema de diseño unificado para toda la plataforma
 */

export const theme = {
  // Colores principales basados en el login
  colors: {
    primary: {
      50: 'bg-blue-50',
      100: 'bg-blue-100',
      500: 'bg-blue-500',
      600: 'bg-blue-600', // Color principal de botones
      700: 'bg-blue-700', // Hover
      800: 'bg-blue-800',
      900: 'bg-blue-900',
    },
    text: {
      primary: 'text-gray-900',      // Títulos principales
      secondary: 'text-gray-600',    // Subtítulos y texto secundario
      tertiary: 'text-gray-500',     // Texto de apoyo
      white: 'text-white',
    },
    border: {
      light: 'border-gray-200',
      default: 'border-gray-300',
      dark: 'border-gray-400',
    },
    background: {
      white: 'bg-white',
      gray: 'bg-gray-50',
      gradient: 'bg-gradient-to-br from-blue-50 via-white to-blue-50',
    }
  },
  
  // Tipografía consistente con el login
  typography: {
    heading: {
      h1: 'text-4xl xl:text-5xl font-bold leading-tight',
      h2: 'text-3xl lg:text-4xl font-bold',
      h3: 'text-2xl lg:text-3xl font-bold',
      h4: 'text-xl lg:text-2xl font-semibold',
      h5: 'text-lg lg:text-xl font-semibold',
    },
    body: {
      large: 'text-lg xl:text-xl',
      base: 'text-base',
      small: 'text-sm',
    }
  },
  
  // Estilos de botones unificados
  buttons: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:ring-4 focus:ring-blue-600/20',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-lg transition-all duration-200',
    outline: 'border-2 border-gray-300 hover:border-blue-600 hover:bg-blue-50 text-gray-900 hover:text-blue-600 font-semibold rounded-lg transition-all duration-200',
    danger: 'bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md',
    success: 'bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md',
  },
  
  // Tamaños de botones
  buttonSizes: {
    sm: 'px-3 py-1.5 text-sm h-8',
    md: 'px-4 py-2 text-base h-10',
    lg: 'px-6 py-3 text-lg h-12',
  },
  
  // Cards y contenedores
  cards: {
    default: 'bg-white rounded-lg shadow-sm',
    hover: 'bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow',
    bordered: 'bg-white rounded-lg border border-gray-200',
  },
  
  // Inputs consistentes
  inputs: {
    default: 'border-gray-300 focus:border-blue-600 focus:ring-blue-600 rounded-lg text-base',
    error: 'border-red-500 focus:border-red-600 focus:ring-red-600 rounded-lg text-base',
    success: 'border-green-500 focus:border-green-600 focus:ring-green-600 rounded-lg text-base',
  },
  
  // Spacing
  spacing: {
    section: 'py-12 px-4 sm:px-6 lg:px-8',
    container: 'max-w-7xl mx-auto',
    card: 'p-6',
  },
  
  // Animaciones
  animations: {
    fadeIn: 'animate-fade-in',
    slideUp: 'animate-slide-up',
    spin: 'animate-spin',
  }
};

// Helper functions para aplicar estilos
export const getButtonClass = (variant: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' = 'primary', size: 'sm' | 'md' | 'lg' = 'md') => {
  return `${theme.buttons[variant]} ${theme.buttonSizes[size]}`;
};

export const getHeadingClass = (level: 'h1' | 'h2' | 'h3' | 'h4' | 'h5') => {
  return `${theme.typography.heading[level]} ${theme.colors.text.primary}`;
};

export const getTextClass = (type: 'primary' | 'secondary' | 'tertiary' = 'primary', size: 'large' | 'base' | 'small' = 'base') => {
  return `${theme.colors.text[type]} ${theme.typography.body[size]}`;
};