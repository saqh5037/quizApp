import { useTranslation } from 'react-i18next';

export default function Register() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-white p-8 rounded-lg shadow-card max-w-md w-full">
        <div className="text-center mb-6">
          <img 
            src="/images/logoAristoTest.png" 
            alt="AristoTest" 
            className="h-20 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900">{t('auth.register.title')}</h1>
          <p className="text-text-secondary mt-2">{t('auth.register.subtitle')}</p>
        </div>
      </div>
    </div>
  );
}