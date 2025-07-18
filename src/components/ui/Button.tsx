import React from 'react';
import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  ...props
}) => {
  return (
    <button className={`btn btn-${variant} ${className || ''}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
