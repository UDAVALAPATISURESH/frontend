import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, gql } from '@apollo/client';
import './Login.css';

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        username
        email
        role
        scopes
        isFirstLogin
        googleId
      }
    }
  }
`;

const Login = () => {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ loginInput: '', password: '' });
  const navigate = useNavigate();

  const [loginMutation, { loading }] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      if (data?.login?.token && data?.login?.user) {
        // Persist MFA context so direct URL navigation/refresh can't bypass flow
        try {
          sessionStorage.setItem(
            'mfa',
            JSON.stringify({
              userId: data.login.user.id,
              userEmail: data.login.user.email,
              token: data.login.token,
              isGoogleAuth: false,
            })
          );
        } catch (e) {
          // If storage is blocked, flow will still work via router state
        }

        // Check if it's first login
        if (data.login.user.isFirstLogin) {
          // First login: Navigate to QR code page for setup
          navigate('/qr-code', {
            state: {
              userId: data.login.user.id,
              userEmail: data.login.user.email,
              token: data.login.token,
              isGoogleAuth: false,
            },
            replace: true,
          });
        } else {
          // Subsequent logins: Navigate directly to OTP verification
          navigate('/verify-otp', {
            state: {
              userId: data.login.user.id,
              userEmail: data.login.user.email,
              token: data.login.token,
              isGoogleAuth: false,
            },
            replace: true,
          });
        }
      } else {
        setError('Invalid response from server');
      }
    },
    onError: (err) => {
      if (err.networkError) {
        setError('Network issue');
      } else {
        // Show specific error messages
        const errorMsg = err.message || 'Login failed';
        setError(errorMsg);
      }
    },
  });

  const validateEmail = (email) => {
    if (!email || email.trim() === '') {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validateField = (fieldName, value) => {
    if (fieldName === 'loginInput') {
      return validateEmail(value);
    }
    if (fieldName === 'password') {
      if (!value || value.trim() === '') {
        return 'Password is required';
      }
      return '';
    }
    return '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const loginInputError = validateField('loginInput', loginInput);
    const passwordError = validateField('password', password);

    setFieldErrors({
      loginInput: loginInputError,
      password: passwordError
    });

    if (loginInputError || passwordError) {
      return;
    }

    loginMutation({
      variables: {
        email: loginInput.trim(),
        password
      }
    });
  };

  const handleInputChange = (fieldName, value) => {
    if (fieldName === 'loginInput') {
      setLoginInput(value);
    } else if (fieldName === 'password') {
      setPassword(value);
    }

    // Clear error when user starts typing
    setError('');
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-container">
            <img
              src="https://res.cloudinary.com/dkjkisdph/image/upload/v1773259356/ChatGPT_Image_Mar_12_2026_01_32_18_AM_uavz08.png"
              alt="Company Logo"
              className="login-logo"
            />
          </div>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error}</span>
            </div>
          )}
          <div className="form-group">
            <label htmlFor="loginInput">Email</label>
            <input
              id="loginInput"
              type="email"
              value={loginInput}
              onChange={(e) => handleInputChange('loginInput', e.target.value)}
              placeholder="Enter your email address"
              className={fieldErrors.loginInput ? 'input-error' : ''}
              autoFocus
            />
            {fieldErrors.loginInput && (
              <span className="field-error-message">{fieldErrors.loginInput}</span>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Enter password"
                className={fieldErrors.password ? 'input-error' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {fieldErrors.password && (
              <span className="field-error-message">{fieldErrors.password}</span>
            )}
          </div>
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

