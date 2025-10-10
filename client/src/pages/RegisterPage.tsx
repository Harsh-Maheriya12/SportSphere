// FILE PATH: client/src/pages/RegisterPage.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [usernameStatus, setUsernameStatus] = useState<'checking' | 'available' | 'taken' | 'idle'>('idle');

  // DEBOUNCED USERNAME CHECK
  useEffect(() => {
    if (username.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    const timerId = setTimeout(async () => {
      setUsernameStatus('checking');
      try {
        const res = await fetch('/api/auth/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        });
        const data = await res.json();
        setUsernameStatus(data.available ? 'available' : 'taken');
      } catch (err) {
        setUsernameStatus('idle');
      }
    }, 500);
    return () => clearTimeout(timerId);
  }, [username]);

  // HANDLE FORM SUBMISSION
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (usernameStatus === 'taken') {
        setError('This username is already taken. Please choose another.');
        return;
    }
    try {
      await register(username, email, password);
      alert('Registration successful! Please log in.');
      navigate('/login');
    } catch (err: any) {
      // --- THIS IS THE KEY CHANGE ---
      // Instead of just using err.message, we now parse the error object
      // to look for the specific validation messages from our backend.
      try {
        // The error object from our fetch helper will contain the parsed JSON
        const errorData = JSON.parse(err.message);
        if (errorData.errors && Array.isArray(errorData.errors)) {
          // If there's an errors array, display the first message
          setError(errorData.errors[0].message);
        } else if (errorData.message) {
          // Fallback for other structured errors
          setError(errorData.message);
        } else {
          setError('An unknown registration error occurred.');
        }
      } catch (parseError) {
        // If the error message isn't JSON, display it directly
        setError(err.message);
      }
      // --- END OF CHANGE ---
    }
  };

  // RENDER USERNAME FEEDBACK (This logic is correct and remains the same)
  const renderUsernameFeedback = () => {
    switch (usernameStatus) {
      case 'checking':
        return <p className="text-sm text-yellow-500 mt-1">Checking availability...</p>;
      case 'available':
        return <p className="text-sm text-green-500 mt-1">Username is available!</p>;
      case 'taken':
        return <p className="text-sm text-red-500 mt-1">Username is already taken.</p>;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="w-full p-8 space-y-6 bg-white rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold text-center text-gray-800">Create an Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-500 text-sm text-center font-semibold mb-2">{error}</p>}
          <div>
            <input 
              type="text" 
              placeholder="Username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
              required 
            />
            {renderUsernameFeedback()}
          </div>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          <button type="submit" className="w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">Register</button>
        </form>
        <p className="text-sm text-center text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:underline">Log in</Link>
        </p>
      </div>
    </Layout>
  );
};

export default RegisterPage;

