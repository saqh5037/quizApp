import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <img 
          src="/images/logoAristoTest.svg" 
          alt="AristoTest" 
          className="h-20 mx-auto mb-8 object-contain"
        />
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <p className="text-xl text-text-secondary mb-8">Page not found</p>
        <Button 
          variant="primary" 
          onClick={() => navigate('/dashboard')}
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}