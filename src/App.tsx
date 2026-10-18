import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

import { ArrowDown, ArrowRight, Menu, X } from "lucide-react";
import { Routes, Route } from "react-router-dom";

import "./App.css";

import Rentals from "./pages/Rentals";
import Movies from "./pages/Movies";

import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./pages/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRentals from "./pages/AdminRentals";
import AdminSectionPlaceholder from "./pages/AdminSectionPlaceholder";
import AdminMovies from "./pages/AdminMovies";
import AdminScreenings from "./pages/AdminScreenings";
import AdminBookings from "./pages/AdminBookings";

const services = [
  {
    number: "01",
    title: "Projector Rentals",
    description:
      "Bring the big-screen experience to your space. Rent cinematic projection equipment for your next gathering.",
    link: "Explore rentals",
    className: "rental-card",
  },
  {
    number: "02",
    title: "Movies & Screenings",
    description:
      "Your next favourite movie, a remarkable venue, and people who love cinema as much as you do.",
    link: "Discover screenings",
    className: "screening-card",
  },
  {
    number: "03",
    title: "Host with Us",
    description:
      "Turn your café, hotel or resort into a destination for unforgettable movie nights.",
    link: "Become a partner",
    className: "partner-card",
  },
];

function App() {
  const heroRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-eyebrow, .hero-title, .hero-copy, .hero-actions", {
        y: 28,
        opacity: 0,
        duration: 1,
        stagger: 0.16,
        ease: "power3.out",
        delay: 0.15,
      });

      gsap.from(".hero-orbit", {
        scale: 0.82,
        opacity: 0,
        duration: 1.5,
        ease: "power3.out",
        delay: 0.25,
      });

      gsap.from(".service-card", {
        y: 35,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".services-grid",
          start: "top 85%",
        },
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <Routes>
      {/* =====================================================
          PUBLIC WEBSITE
      ===================================================== */}

      <Route
        path="/"
        element={
          <main ref={heroRef}>
            <header className="navbar">
              <a
                className="brand"
                href="#home"
                onClick={closeMenu}
                aria-label="CINETARA home"
              >
                <img
                  className="brand-logo"
                  src="/cinetara-logo.png"
                  alt="CINETARA"
                />
              </a>

              <button
                className="mobile-menu-toggle"
                type="button"
                aria-label={
                  menuOpen ? "Close navigation" : "Open navigation"
                }
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>

              <nav
                className={
                  menuOpen ? "nav-links nav-open" : "nav-links"
                }
              >
                <a href="#experience" onClick={closeMenu}>
                  Experience
                </a>

                <a href="#rentals" onClick={closeMenu}>
                  Rentals
                </a>

                <a href="/movies" onClick={closeMenu}>
                  Screenings
                </a>

                <a href="#partners" onClick={closeMenu}>
                  For venues
                </a>

                <a
                  className="nav-cta"
                  href="#experience"
                  onClick={closeMenu}
                >
                  Enter CINETARA <ArrowRight size={15} />
                </a>
              </nav>
            </header>

            <section className="hero" id="home">
              <div className="hero-grid" aria-hidden="true" />
              <div className="hero-glow hero-glow-one" aria-hidden="true" />
              <div className="hero-glow hero-glow-two" aria-hidden="true" />

              <div className="hero-content">
                <div className="hero-eyebrow">
                  <span className="live-dot" />
                  YOUR WORLD. THE BIG SCREEN.
                </div>

                <h1 className="hero-title">
                  Cinema is
                  <br />
                  <span>an experience.</span>
                  <br />
                  Make it yours.
                </h1>

                <p className="hero-copy">
                  From private projector rentals to extraordinary movie nights
                  at handpicked venues, discover a more personal way to
                  experience cinema.
                </p>

                <div className="hero-actions">
                  <a className="button-primary" href="#experience">
                    Explore the experience <ArrowRight size={17} />
                  </a>

                  <a className="button-secondary" href="/movies">
                    Discover movie nights
                  </a>
                </div>

                <div className="hero-footnote">
                  <span className="footnote-line" />
                  MADE FOR THE LOVE OF CINEMA
                </div>
              </div>

              <div
                className="hero-visual"
                aria-label="Abstract cinematic screen installation"
              >
                <div className="hero-orbit orbit-outer" />
                <div className="hero-orbit orbit-inner" />

                <div className="screen-shadow" />

                <div className="cinema-frame">
                  <div className="frame-topline">
                    <span>C / 001</span>
                    <span>THE CINEMA EXPERIENCE</span>
                  </div>

                  <div className="screen-art">
                    <div className="screen-light" />
                    <div className="screen-horizon" />
                    <div className="screen-sun" />
                    <div className="screen-mountain mountain-back" />
                    <div className="screen-mountain mountain-front" />
                    <div className="screen-floor" />
                  </div>

                  <div className="frame-bottomline">
                    <span>BEYOND THE ORDINARY</span>

                    <span className="frame-status">
                      <span /> READY TO PLAY
                    </span>
                  </div>
                </div>

                <div className="visual-caption">
                  <span className="caption-index">01 / 03</span>
                  <span>REIMAGINE MOVIE NIGHT</span>
                </div>
              </div>

              <a className="scroll-indicator" href="#experience">
                <span>SCROLL TO EXPLORE</span>
                <ArrowDown size={15} />
              </a>

              <span className="hero-index">
                18° / A NEW PERSPECTIVE
              </span>
            </section>

            <section className="intro-section" id="experience">
              <div className="section-label">
                <span>01</span> THE CINETARA DIFFERENCE
              </div>

              <div className="intro-layout">
                <h2>
                  Not just a screen.
                  <br />
                  <span>A feeling.</span>
                </h2>

                <p>
                  We believe the best movie moments happen when the setting
                  becomes part of the story. Choose your setup, find your
                  screening, or create a destination people remember.
                </p>
              </div>
            </section>

            <section className="services-section" id="rentals">
              <div className="section-heading">
                <div>
                  <div className="section-label">
                    <span>02</span> FIND YOUR EXPERIENCE
                  </div>

                  <h2>
                    Three ways to <span>press play.</span>
                  </h2>
                </div>

                <p>
                  One love for cinema. More ways to experience it.
                </p>
              </div>

              <div className="services-grid">
                {services.map((service) => (
                  <article
                    className={`service-card ${service.className}`}
                    id={
                      service.number === "02"
                        ? "screenings"
                        : service.number === "03"
                          ? "partners"
                          : undefined
                    }
                    key={service.number}
                  >
                    <div className="service-art" aria-hidden="true">
                      {service.number === "01" ? (
                        <div className="projector-art">
                          <div className="projector-lens" />
                          <div className="projector-body" />
                          <div className="projector-foot" />
                          <div className="projector-beam" />
                        </div>
                      ) : service.number === "02" ? (
                        <div className="screen-artwork">
                          <div className="artwork-sun" />
                          <div className="artwork-hill hill-one" />
                          <div className="artwork-hill hill-two" />
                        </div>
                      ) : (
                        <div className="venue-art">
                          <div className="venue-building" />
                          <div className="venue-window" />
                          <div className="venue-window second-window" />
                          <div className="venue-light" />
                        </div>
                      )}

                      <span className="art-number">
                        {service.number}
                      </span>
                    </div>

                    <div className="service-content">
                      <h3>{service.title}</h3>

                      <p>{service.description}</p>

                      <a
                        href={
                          service.number === "01"
                            ? "/rentals"
                            : service.number === "02"
                              ? "/movies"
                              : "#partners"
                        }
                      >
                        {service.link} <ArrowRight size={16} />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="closing-section">
              <div className="closing-glow" />

              <div className="section-label">
                <span>03</span> YOUR NEXT MOVIE MOMENT
              </div>

              <h2>
                Every great night
                <br />
                starts with <span>play.</span>
              </h2>

              <a className="button-primary" href="/movies">
                Find your experience <ArrowRight size={17} />
              </a>
            </section>

            <footer className="footer">
              <a
                className="brand footer-brand"
                href="#home"
                aria-label="CINETARA home"
              >
                <img
                  className="brand-logo"
                  src="/cinetara-logo.png"
                  alt="CINETARA"
                />
              </a>

              <span className="footer-note">
                A NEW WAY TO EXPERIENCE CINEMA.
              </span>

              <div className="footer-right">
                <a
                  className="admin-footer-link"
                  href="/admin/login"
                >
                  Admin Login
                </a>

                <span className="copyright">
                  © {new Date().getFullYear()} CINETARA
                </span>
              </div>
            </footer>
          </main>
        }
      />

      {/* =====================================================
          PUBLIC PAGES
      ===================================================== */}

      <Route path="/rentals" element={<Rentals />} />

      <Route path="/movies" element={<Movies />} />

      {/* =====================================================
          ADMIN LOGIN
      ===================================================== */}

      <Route
        path="/admin/login"
        element={<AdminLogin />}
      />

      {/* =====================================================
          ADMIN APPLICATION
          AdminLayout protects all routes below it.
      ===================================================== */}

     <Route path="/admin" element={<AdminLayout />}>
  <Route index element={<AdminDashboard />} />

  <Route
    path="rentals"
    element={<AdminRentals />}
  />

  <Route
    path="movies"
    element={<AdminMovies />}
  />

  <Route
    path="screenings"
    element={<AdminScreenings />}
  />

  <Route
  path="bookings"
  element={<AdminBookings />}
/>

  <Route
    path="settings"
    element={
      <AdminSectionPlaceholder
        section="Settings"
        description="Manage CINETARA administrative settings and system configuration."
        phase="Settings"
      />
    }
  />
</Route>
</Routes>
  );
}

export default App;