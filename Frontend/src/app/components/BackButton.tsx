'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const BackButton: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    // Create style element
    if (!document.getElementById('home-button-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'home-button-styles';

      styleEl.textContent = `
        /* Home Button Styles - Golden-Purple Theme */
        .home-button {
          background: linear-gradient(135deg, #8A2BE2, #DAA520);
          color: #FFFFFF;
          font-weight: 600;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          font-size: 1rem;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .home-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: all 0.6s ease;
        }

        .home-button:hover {
          background: linear-gradient(135deg, #4B0082, #9400D3);
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(138, 43, 226, 0.3);
        }

        .home-button:hover::before {
          left: 100%;
        }

        .home-button:active {
          transform: translateY(0);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .home-button:focus {
          outline: 2px solid #DAA520;
          outline-offset: 2px;
        }

        @media (max-width: 768px) {
          .home-button {
            padding: 0.625rem 1.25rem;
            font-size: 0.875rem;
          }
        }
      `;

      document.head.appendChild(styleEl);
    }
  }, []);

  return (
    <button
     onClick={() => {
  router.push('/');
  setTimeout(() => {
    window.scrollTo(0, 0);
    document.body.style.overflow = 'auto';
  }, 100); // delay ensures router.push completes
}}

      className="home-button"
      aria-label="Go to home page"
    >
      🏠 Home
    </button>
  );
};

export default BackButton;
