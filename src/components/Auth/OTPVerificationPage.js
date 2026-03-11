import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, gql } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';
import './FirstTimeLogin.css';

const VERIFY_OTP_MUTATION = gql`
  mutation VerifyOTP($userId: ID!, $otp: String!, $secret: String) {
    verifyOTP(userId: $userId, otp: $otp, secret: $secret) {
      token
      user {
        id
        username
        email
        role
        scopes
      }
    }
  }
`;

const OTPVerificationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const mfaFromState = location.state || {};
  let mfaFromStorage = {};
  try {
    mfaFromStorage = JSON.parse(sessionStorage.getItem('mfa') || '{}');
  } catch (e) {
    mfaFromStorage = {};
  }
  const mfa = { ...mfaFromStorage, ...mfaFromState };

  const userId = mfa.userId;
  const userEmail = mfa.userEmail;
  const secret = mfa.secret;
  const token = mfa.token;
  const isGoogleAuth = mfa.isGoogleAuth || false;

  // Guard: don't allow opening this page directly without coming from login
  useEffect(() => {
    if (!userId || !token) {
      navigate('/login', { replace: true });
      return;
    }

    // Persist (so refresh doesn't break the flow)
    try {
      sessionStorage.setItem('mfa', JSON.stringify(mfa));
    } catch (e) { }
  }, [userId, token, navigate]);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [verifyOTP] = useMutation(VERIFY_OTP_MUTATION, {
    onCompleted: (data) => {
      if (data?.verifyOTP?.token && data?.verifyOTP?.user) {
        try {
          sessionStorage.removeItem('mfa');
        } catch (e) { }
        login(data.verifyOTP.user, data.verifyOTP.token);
        navigate('/dashboard', { replace: true });
      } else {
        setError('Invalid response from server');
      }
      setLoading(false);
    },
    onError: (err) => {
      setError(err.message || 'Invalid OTP. Please try again.');
      setLoading(false);
    },
  });

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return; // Only allow single digit
    if (!/^\d*$/.test(value)) return; // Only allow numbers

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }

    setError('');
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      // Focus last input
      const lastInput = document.getElementById('otp-5');
      if (lastInput) lastInput.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter a 6-digit OTP');
      return;
    }

    if (!userId) {
      setError('Missing required information. Please start over.');
      return;
    }

    setLoading(true);
    verifyOTP({
      variables: {
        userId,
        otp: otpString,
        secret: secret || null, // Secret is optional for subsequent logins
      },
    });
  };

  const handleBack = () => {
    // If we have a secret, they were just on the QR code page
    if (secret) {
      navigate('/qr-code', {
        state: {
          userId,
          userEmail,
          token,
          isGoogleAuth,
        },
      });
    } else {
      // For standard logins, clear storage and go directly to login page
      try {
        sessionStorage.removeItem('mfa');
      } catch (e) { }
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="first-login-container">
      <div className="first-login-card">
        <div className="first-login-header">
          <div className="first-login-logo-container">
            <img
              src="https://res.cloudinary.com/dkjkisdph/image/upload/v1773259356/ChatGPT_Image_Mar_12_2026_01_32_18_AM_uavz08.png"
              alt="Company Logo"
              className="first-login-logo"
            />
          </div>
          <h2>Verify OTP</h2>
          <p className="first-login-subtitle">
            {secret
              ? (isGoogleAuth
                ? 'Enter the 6-digit code from your Google Authenticator app'
                : 'Enter the 6-digit code from your authenticator app')
              : 'Enter the 6-digit code from your authenticator app to continue'}
          </p>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="otp-form">
          <div className="otp-input-container">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className={`otp-input ${error ? 'otp-input-error' : ''}`}
                autoFocus={index === 0}
                disabled={loading}
              />
            ))}
          </div>

          <div className="otp-actions">
            <button
              type="button"
              className="back-button"
              onClick={handleBack}
              disabled={loading}
            >
              ← Back
            </button>
            <button
              type="submit"
              className="verify-button"
              disabled={loading || otp.join('').length !== 6}
              style={{ flex: 1 }}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>
        </form>

        {/* <div className="otp-help">
          <p>Having trouble?</p>
          <ul>
            <li>Make sure your device time is synchronized</li>
            <li>Check that you're using the correct authenticator app</li>
            <li>Try scanning the QR code again if needed</li>
          </ul>
        </div> */}
      </div>
    </div>
  );
};

export default OTPVerificationPage;
