import React from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Copyright,
} from "lucide-react";
import Logo from "../assets/SportSphereLogo.jpg";

function Footer() {
  return (
    <footer className="bg-footer text-footer-foreground w-full">
      <div className="w-full py-12 px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <img
                src={Logo}
                alt="SportSphere Logo"
                className="h-8 w-auto mr-2 rounded-xl"
              />

              <span className="text-xl font-semibold text-primary">
                Sport Sphere
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Connecting players, venues, and coaches in one unified platform.
              Your ultimate sports community.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-primary transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4 text-primary">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/venues"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Venues
                </Link>
              </li>
              <li>
                <Link
                  to="/coaches"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Coaches
                </Link>
              </li>
              <li>
                <Link
                  to="/games"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Games
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4 text-primary">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/about"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                
                <a
                  href="#"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold mb-4 text-primary">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  DA-IICT Campus, Gandhinagar, Gujarat, India
                </span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  +91 123-456-7890
                </span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  support@sportsphere.com
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border mt-8 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            <Copyright className="w-4 h-4 inline-block mb-0.5 text-primary" />{" "}
            2025 SportSphere. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
