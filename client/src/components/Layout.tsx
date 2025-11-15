import React, { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground space-y-5">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

export default Layout;
