interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-16',
  xl: 'h-20',
};

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  return (
    <img 
      src="/images/logoAristoTest.svg" 
      alt="AristoTest" 
      className={`${sizeClasses[size]} ${className} object-contain`}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
}