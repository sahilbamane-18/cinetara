import {
  ArrowRight,
  CalendarDays,
  Clapperboard,
  Film,
  Ticket,
} from "lucide-react";
import { Link } from "react-router-dom";

import "./AdminDashboard.css";

function AdminDashboard() {
  return (
    <div className="admin-dashboard">
      <section className="dashboard-heading">
        <div>
          <div className="dashboard-eyebrow">
            CINETARA ADMINISTRATION
          </div>

          <h1>
            Command <span>Center.</span>
          </h1>

          <p>
            One place to coordinate rentals, movies, screenings
            and bookings across CINETARA.
          </p>
        </div>

        <div className="dashboard-date">
          <span>CONTROL PANEL</span>
          <strong>LIVE</strong>
        </div>
      </section>

      <section className="dashboard-overview-grid">
        <Link
          to="/admin/rentals"
          className="dashboard-module dashboard-module-rentals"
        >
          <div className="dashboard-module-top">
            <div className="dashboard-module-icon">
              <CalendarDays size={20} />
            </div>

            <span>01</span>
          </div>

          <div className="dashboard-module-content">
            <div className="dashboard-module-label">
              PROJECTOR RENTALS
            </div>

            <h2>
              Rental <span>Enquiries</span>
            </h2>

            <p>
              Review customer enquiries, event requirements,
              preferred dates, budgets and enquiry status.
            </p>
          </div>

          <div className="dashboard-module-link">
            Manage rentals
            <ArrowRight size={15} />
          </div>
        </Link>

        <Link
          to="/admin/movies"
          className="dashboard-module dashboard-module-movies"
        >
          <div className="dashboard-module-top">
            <div className="dashboard-module-icon">
              <Film size={20} />
            </div>

            <span>02</span>
          </div>

          <div className="dashboard-module-content">
            <div className="dashboard-module-label">
              CONTENT MANAGEMENT
            </div>

            <h2>
              Movie <span>Library</span>
            </h2>

            <p>
              Add unlimited movies and control posters, hero
              artwork, descriptions, metadata and release status.
            </p>
          </div>

          <div className="dashboard-module-link">
            Manage movies
            <ArrowRight size={15} />
          </div>
        </Link>

        <Link
          to="/admin/screenings"
          className="dashboard-module dashboard-module-screenings"
        >
          <div className="dashboard-module-top">
            <div className="dashboard-module-icon">
              <Clapperboard size={20} />
            </div>

            <span>03</span>
          </div>

          <div className="dashboard-module-content">
            <div className="dashboard-module-label">
              SHOW CONTROL
            </div>

            <h2>
              Screening <span>Schedule</span>
            </h2>

            <p>
              Coordinate movies, dates, showtimes, screens,
              pricing and show availability.
            </p>
          </div>

          <div className="dashboard-module-link">
            Manage screenings
            <ArrowRight size={15} />
          </div>
        </Link>

        <Link
          to="/admin/bookings"
          className="dashboard-module dashboard-module-bookings"
        >
          <div className="dashboard-module-top">
            <div className="dashboard-module-icon">
              <Ticket size={20} />
            </div>

            <span>04</span>
          </div>

          <div className="dashboard-module-content">
            <div className="dashboard-module-label">
              CUSTOMER SALES
            </div>

            <h2>
              Movie <span>Bookings</span>
            </h2>

            <p>
              Track bookings, seats, payment state and group
              ticket information.
            </p>
          </div>

          <div className="dashboard-module-link">
            Manage bookings
            <ArrowRight size={15} />
          </div>
        </Link>
      </section>

      <section className="dashboard-coordination">
        <div className="coordination-heading">
          <div className="dashboard-eyebrow">
            CINETARA OPERATING MODEL
          </div>

          <h2>
            Everything connects to the <span>show.</span>
          </h2>

          <p>
            Movies define the content. Screens define where it
            plays. Shows define when it plays. Bookings connect
            customers to those shows.
          </p>
        </div>

        <div className="coordination-flow">
          <div>
            <span>01</span>
            <strong>Movie</strong>
          </div>

          <i>→</i>

          <div>
            <span>02</span>
            <strong>Date</strong>
          </div>

          <i>→</i>

          <div>
            <span>03</span>
            <strong>Time</strong>
          </div>

          <i>→</i>

          <div>
            <span>04</span>
            <strong>Screen</strong>
          </div>

          <i>→</i>

          <div>
            <span>05</span>
            <strong>Price</strong>
          </div>

          <i>→</i>

          <div>
            <span>06</span>
            <strong>Booking</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;