import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout'; 

const HomePage: React.FC = () => {
  return (
    <Layout>
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Your One-Stop Sports Companion</h2>
        <p className="text-lg text-gray-600 mb-8">Book a match, find players, or join a community.</p>
        <div className="space-x-4">
          <Link to="/login">
            <button className="px-8 py-3 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
              Login
            </button>
          </Link>
          <Link to="/register">
            <button className="px-8 py-3 font-semibold text-white bg-green-500 rounded-md hover:bg-green-600 transition-colors">
              Sign Up
            </button>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;