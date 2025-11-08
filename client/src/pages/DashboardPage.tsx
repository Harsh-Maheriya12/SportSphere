import React from 'react';
import { useAuth } from '../context/AuthContext';

const DashboardPage: React.FC = () => {
    const { user, logout } = useAuth();

    if (!user) {
        return <div>Loading user data...</div>;
    }

    return (
        // The page content is now wrapped by the Layout component

        <div className="text-center p-8 rounded-xl shadow-lg  bg-white/10">
            <h2 className="text-4xl font-bold text-primary">Welcome, {user.username}!</h2>
            <p className="mt-4 text-lg text-muted-foreground">You are successfully logged in.</p>
            <p className="mt-2 text-md text-muted-foreground">Your email: {user.email}</p>
            <p className="text-md text-muted-foreground">Your role: {user.role}</p>
            <button onClick={logout} className="mt-8 px-6 py-2 font-semibold text-destructive-foreground bg-destructive rounded-md hover:opacity-90 transition-colors">
                Logout
            </button>
        </div>

    );
};

export default DashboardPage;
