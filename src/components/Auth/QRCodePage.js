import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, gql } from '@apollo/client';
import './FirstTimeLogin.css';

const GENERATE_QR_MUTATION = gql`
  mutation GenerateQR($userId: ID!) {
    generateQR(userId: $userId) {
      qrCode
      secret
    }
  }
`;

const QRCodePage = () => {
  const location = useLocation();
  const navigate = useNavigate();

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
  const token = mfa.token;
  const isGoogleAuth = mfa.isGoogleAuth || false;

  const [qrData, setQrData] = useState(null);
  const [error, setError] = useState('');

  // Guard: don't allow opening this page directly without coming from login
  useEffect(() => {
    if (!userId || !token) {
      navigate('/login', { replace: true });
    }
  }, [userId, token, navigate]);

  const [generateQR, { loading }] = useMutation(GENERATE_QR_MUTATION, {
    onCompleted: (data) => {
      if (data?.generateQR) {
        setQrData(data.generateQR);
      }
    },
    onError: (err) => {
      setError(err.message || 'Failed to generate QR code');
    },
  });

  useEffect(() => {
    if (userId) {
      generateQR({ variables: { userId } });
    } else {
      setError('User ID is required');
    }
  }, [userId, generateQR]);

  const handleNext = () => {
    if (qrData) {
      // Persist secret so refresh on /verify-otp doesn't break first-time setup
      try {
        sessionStorage.setItem(
          'mfa',
          JSON.stringify({
            userId,
            userEmail,
            token,
            isGoogleAuth,
            secret: qrData.secret,
          })
        );
      } catch (e) {}

      navigate('/verify-otp', {
        state: {
          userId,
          userEmail,
          secret: qrData.secret,
          token,
          isGoogleAuth,
        },
      });
    }
  };

  return (
    <div className="first-login-container">
      <div className="first-login-card">
        <div className="first-login-header">
          <div className="first-login-logo-container">
            <img
              src="https://res.cloudinary.com/dkjkisdph/image/upload/v1771856045/ChatGPT_Image_Feb_23_2026_07_43_46_PM_jdjg1u.png"
              alt="Company Logo"
              className="first-login-logo"
            />
          </div>
          <h2>First Time Login Setup</h2>
          <p className="first-login-subtitle">
            {isGoogleAuth
              ? 'Scan this QR code with your authenticator app to enable Google Authentication'
              : 'Scan this QR code with your authenticator app to complete setup'}
          </p>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Generating QR code...</p>
          </div>
        ) : qrData ? (
          <div className="qr-content">
            <div className="qr-code-wrapper">
              {/* Backend always returns a QR image (data URL) */}
              <img
                src={qrData.qrCode}
                alt="QR Code"
                className="qr-code"
                style={{ width: 256, height: 256 }}
              />
            </div>
            {/* <div className="qr-instructions">
              <h3>Instructions:</h3>
              <ol>
                <li>Open your authenticator app (Google Authenticator, Authy, etc.)</li>
                <li>Scan this QR code with your phone</li>
                <li>Click "Next" to proceed to OTP verification</li>
              </ol>
            </div> */}
            <button
              className="next-button"
              onClick={handleNext}
              disabled={!qrData}
            >
              Next →
            </button>
          </div>
        ) : (
          <div className="error-container">
            <p>Unable to generate QR code. Please try again.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRCodePage;
