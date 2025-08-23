import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Card from '../components/common/Card';
import { RiMailLine, RiLockLine } from 'react-icons/ri';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login, isLoading } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (error) {
      // Error handled by store
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <img 
            src="/images/logoAristoTest.png" 
            alt="AristoTest" 
            className="h-screen max-h-[500px] w-auto mx-auto mb-4"
          />
          <p className="text-text-secondary">{t('auth.login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            type="email"
            label={t('auth.login.email')}
            placeholder={t('auth.login.emailPlaceholder')}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            leftIcon={<RiMailLine />}
            required
            fullWidth
          />

          <Input
            type="password"
            label={t('auth.login.password')}
            placeholder={t('auth.login.passwordPlaceholder')}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            leftIcon={<RiLockLine />}
            required
            fullWidth
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
          >
            {t('auth.login.submit')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-text-secondary">
            {t('auth.login.noAccount')}{' '}
            <Link to="/register" className="text-primary hover:text-primary-dark">
              {t('auth.login.signup')}
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}