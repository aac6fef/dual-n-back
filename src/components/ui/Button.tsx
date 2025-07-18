import React from 'react';
import { LoaderCircle } from 'lucide-react';
import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  loading = false,
  ...props
}) => {
  return (
    <button
      className={`btn btn-${variant} ${className || ''}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <LoaderCircle className="loader" size={20} /> : children}
    </button>
  );
};

export default Button;
