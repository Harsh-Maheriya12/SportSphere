import React from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout'; 

const DashboardPage: React.FC = () => {
    const { user, logout } = useAuth();

    if (!user) {
        return <Layout><div>Loading user data...</div></Layout>;
    }

    return (
        // The page content is now wrapped by the Layout component
        <Layout>
            <div className="text-center p-8 bg-white rounded-xl shadow-lg">
                <h2 className="text-4xl font-bold text-gray-800">Welcome, {user.username}!</h2>
                <p className="mt-4 text-lg text-gray-600">You are successfully logged in.</p>
                <p className="mt-2 text-md text-gray-500">Your email: {user.email}</p>
                <p className="text-md text-gray-500">Your role: {user.role}</p>
                <button onClick={logout} className="mt-8 px-6 py-2 font-semibold text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors">
                    Logout
                </button>
            </div>
        </Layout>
    );
};

export default DashboardPage;
