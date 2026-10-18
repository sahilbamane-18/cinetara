import {
  ArrowRight,
  Clapperboard,
  Film,
  Settings,
  Ticket,
} from "lucide-react";
import { Link } from "react-router-dom";

import "./AdminSectionPlaceholder.css";

type Props = {
  section: string;
  description: string;
  phase: string;
};

function AdminSectionPlaceholder({
  section,
  description,
  phase,
}: Props) {
  const Icon =
    section === "Movies"
      ? Film
      : section === "Screenings"
        ? Clapperboard
        : section === "Bookings"
          ? Ticket
          : Settings;

  return (
    <div className="admin-placeholder">
      <div className="admin-placeholder-icon">
        <Icon size={28} strokeWidth={1.4} />
      </div>

      <div className="admin-placeholder-eyebrow">
        CINETARA / ADMIN / {section.toUpperCase()}
      </div>

      <h1>
        {section} <span>Manager.</span>
      </h1>

      <p>{description}</p>

      <div className="admin-placeholder-status">
        <span />
        {phase} is the next build phase
      </div>

      <Link to="/admin" className="admin-placeholder-back">
        Back to Dashboard
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}

export default AdminSectionPlaceholder;