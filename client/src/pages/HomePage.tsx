import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { ChevronRight, Users, MapPin, Award } from "lucide-react";
import Logo from "../assets/SportSphereLogo.jpg";
import Plasma from "../components/background/Plasma";
import { useAuth } from "../context/AuthContext";
import VenueCard from "../components/cards/VenueCard";
import CoachCard from "../components/cards/CoachCard";
import GameCard from "../components/cards/GameCard";
import { apiGetAllCoaches, apiGetGames } from "../services/api";
import { Game } from "../types";

interface Coach {
  id: string;
  username: string;
  email: string;
  profilePhoto: string;
  age: number;
  gender: string;
  sports: string[];
  location: {
    city: string;
    state: string;
    country: string;
  };
  pricing: number;
  experience: number;
}

function HomePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [games, setGames] = useState<Game[]>([]);

  // Fetch coaches
  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const response = await apiGetAllCoaches();
        setCoaches(response.coaches.slice(0, 3));
      } catch (error) {
        console.error("Failed to load coaches:", error);
      }
    };

    fetchCoaches();
  }, []);

  // Fetch games
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await apiGetGames();
        setGames((response.games || []).slice(0, 3));
      } catch (error) {
        console.error("Failed to load games:", error);
      }
    };

    fetchGames();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative min-h-[600px] w-full">
        <div className="absolute inset-0 z-0 p-2">
          {/* Background Effect */}
          <Plasma
            color="#ff6b35"
            speed={0.6}
            direction="forward"
            scale={2.2}
            opacity={0.8}
            mouseInteractive={false}
          />
        </div>
        <section className="relative z-10 flex items-center justify-center min-h-[600px]">
          {/* Hero Section*/}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 right-10 w-72 h-72 bg-primary rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 left-10 w-96 h-96 bg-secondary rounded-full blur-3xl opacity-20"></div>
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="mb-6 inline-block">
              <span className="px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-semibold">
                The Complete Sports Ecosystem
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 text-balance leading-tight">
              Connect. Play. <span className="text-primary">Grow.</span>
            </h1>

            <p className="text-xl sm:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto text-balance leading-relaxed">
              SportSphere unites players, venues, and coaches into one powerful
              platform. Book venues, host games, discover coaches, and build
              your sports community.
            </p>

            {!isAuthenticated && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/login">
                  <Button
                    size="lg"
                    className="bg-orange-500 border-transparent hover:border-white/90 hover:border-2 box-border border-2 rounded-xl text-background font-bold text-lg px-8"
                  >
                    Start Your Journey
                    <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* User Segments Section */}
      <section
        id="features"
        className="py-20 bg-background border-t border-border/20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              Built for <span className="text-primary">Everyone</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              An Unified Platform for Players, Venue Owners, and Coaches
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Players */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-background border border-primary/20 hover:border-primary/60 transition-all p-8">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-background" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-primary">
                  For Players
                </h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Book venues, host or join games, book training session with
                  expert coaches.
                </p>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    Easy venue booking
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    Game discovery & hosting
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    Coaching connections
                  </li>
                </ul>
              </div>
            </div>

            {/* Venue Owners*/}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-background border border-primary/20 hover:border-primary/60 transition-all p-8">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <MapPin className="w-6 h-6 text-background" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-primary">
                  For Venue Owners
                </h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Manage Venue listings, update availability, set pricing, and
                  track bookings all in one dashboard.
                </p>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    Listing management
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    Dynamic pricing control
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    Booking analytics
                  </li>
                </ul>
              </div>
            </div>

            {/* Coaches */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-background border border-primary/20 hover:border-primary/60 transition-all p-8">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Award className="w-6 h-6 text-background" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-primary">
                  For Coaches
                </h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Showcase expertise, set availability, accept bookings
                </p>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    Profile showcase
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    Booking management
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    Ratings & reviews
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why SportSphere Section */}
      <section className="py-20 bg-background border-t border-border/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl sm:text-5xl font-black mb-4">
                Why <span className="text-primary">SportSphere</span>?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Traditional booking apps only solve part of the problem.
                SportSphere goes beyond venue reservations by integrating venue
                management, game hosting, and coach discovery into a single,
                unified solution.
              </p>

              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="w-6 h-6 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <ChevronRight className="w-4 h-4 text-black" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">
                      Complete Ecosystem
                    </h3>
                    <p className="text-muted-foreground">
                      Everything you need in one place
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-6 h-6 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <ChevronRight className="w-4 h-4 text-black" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">
                      Community Driven
                    </h3>
                    <p className="text-muted-foreground">
                      Connect with players, venues, and coaches
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-6 h-6 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <ChevronRight className="w-4 h-4 text-black" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">
                      Accessibility
                    </h3>
                    <p className="text-muted-foreground">
                      Making sports more accessible to everyone
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-orange-500/20 to-orange-600/5 border border-orange-500/30 p-8">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-black opacity-20"></div>
                <div className="relative z-10 space-y-6">
                  <div className="bg-card/50 backdrop-blur rounded-xl p-4 border border-primary/20">
                    <p className="text-sm font-semibold text-primary mb-2">
                      Unified Platform
                    </p>
                    <p className="text-foreground">
                      All your sports needs in one integrated ecosystem
                    </p>
                  </div>
                  <div className="bg-card/50 backdrop-blur rounded-xl p-4 border border-primary/20">
                    <p className="text-sm font-semibold text-primary mb-2">
                      Simplified Booking
                    </p>
                    <p className="text-foreground">
                      Find venues, join games, and hire coaches seamlessly
                    </p>
                  </div>
                  <div className="bg-card/50 backdrop-blur rounded-xl p-4 border border-primary/20">
                    <p className="text-sm font-semibold text-primary mb-2">
                      Community Engagement
                    </p>
                    <p className="text-foreground">
                      Build connections and grow your sports network
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Venues Cards */}
      <section className="py-20 bg-background border-t border-primary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              Discover <span className="text-primary">Top Venues</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Find and book the best sports venues in your area
            </p>
          </div>

          {/* Change this */}

          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {venues.map((venue) => (
              <VenueCard
                key={venue.id}
                id={venue.id.toString()}
                name={venue.name}
                location={venue.location}
                rating={venue.rating}
                reviews={venue.reviews}
                sports={venue.sports}
                image={venue.image}
              />
            ))}
          </div> */}
        </div>
      </section>

      {/* Coach Cards */}
      <section className="py-20 bg-background border-t border-primary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              Expert <span className="text-primary">Coaches</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Hire professional coaches to improve your skills
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {coaches.map((coach) => (
              <CoachCard key={coach.id} coach={coach} />
            ))}
          </div>
        </div>
      </section>

      {/* Games Cards */}
      <section className="py-20 bg-background border-t border-primary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              Upcoming <span className="text-primary">Games</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join exciting games and meet the sports community
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {games.map((game) => (
              <GameCard key={game._id} game={game} onOpen={(id) => navigate(`/games/${id}`)} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-background to-secondary/20 border-t border-primary/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-black mb-6">
            {isAuthenticated && (
              <>
                <h2>
                  Keep Going{" "}
                  <span className="text-primary mt-2">Champ !!!</span>
                </h2>
              </>
            )}

            {!isAuthenticated && (
              <p>"Ready to Transform Your Sports Experience?"</p>
            )}
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!isAuthenticated && (
              <Link to="/login">
                <Button className="bg-orange-500 border-transparent hover:border-white/90 hover:border-2 box-border border-2 rounded-xl text-background font-bold text-lg px-8">
                  Get Started Now
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
