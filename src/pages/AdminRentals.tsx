import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import "./AdminRentals.css";

type EnquiryStatus =
  | "new"
  | "contacted"
  | "confirmed"
  | "cancelled"
  | "closed";

type Enquiry = {
  id: string;
  reference_code: string;
  message: string | null;
  status: EnquiryStatus;
  created_at: string;

  customers:
    | {
        full_name: string;
        email: string;
      }
    | null;

  rental_details:
    | {
        preferred_date: string | null;
        preferred_location: string | null;
        event_type: string | null;
        expected_duration: string | null;
        budget: number | null;
      }
    | null;
};

const statusLabels: Record<EnquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  closed: "Closed",
};

function AdminRentals() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | EnquiryStatus
  >("all");

  const loadEnquiries = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const { data: adminStatus, error: adminError } =
      await supabase.rpc("is_admin");

    if (adminError || !adminStatus) {
      return;
    }

    const { data, error } = await supabase
      .from("enquiries")
      .select(
        `
        id,
        reference_code,
        message,
        status,
        created_at,
        customers (
          full_name,
          email
        ),
        rental_details (
          preferred_date,
          preferred_location,
          event_type,
          expected_duration,
          budget
        )
      `
      )
      .order("created_at", { ascending: false });

    if (!error && data) {
      setEnquiries(data as unknown as Enquiry[]);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      await loadEnquiries();
      setIsLoading(false);
    };

    initialize();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadEnquiries();
    setIsRefreshing(false);
  };

  const updateStatus = async (
    id: string,
    status: EnquiryStatus
  ) => {
    const { error } = await supabase
      .from("enquiries")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error(error);
      return;
    }

    setEnquiries((current) =>
      current.map((enquiry) =>
        enquiry.id === id
          ? { ...enquiry, status }
          : enquiry
      )
    );
  };

  const filteredEnquiries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return enquiries.filter((enquiry) => {
      const customerName =
        enquiry.customers?.full_name?.toLowerCase() ?? "";

      const customerEmail =
        enquiry.customers?.email?.toLowerCase() ?? "";

      const reference =
        enquiry.reference_code?.toLowerCase() ?? "";

      const location =
        enquiry.rental_details?.preferred_location?.toLowerCase() ??
        "";

      const matchesSearch =
        !query ||
        customerName.includes(query) ||
        customerEmail.includes(query) ||
        reference.includes(query) ||
        location.includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        enquiry.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [enquiries, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: enquiries.length,
      new: enquiries.filter(
        (item) => item.status === "new"
      ).length,
      contacted: enquiries.filter(
        (item) => item.status === "contacted"
      ).length,
      confirmed: enquiries.filter(
        (item) => item.status === "confirmed"
      ).length,
      cancelled: enquiries.filter(
        (item) => item.status === "cancelled"
      ).length,
    }),
    [enquiries]
  );

  const formatDate = (date: string | null) => {
    if (!date) return "Not specified";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCreatedAt = (date: string) => {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatBudget = (budget: number | null) => {
    if (budget === null || budget === undefined) {
      return "Not specified";
    }

    return `₹${Number(budget).toLocaleString("en-IN")}`;
  };

  return (
    <div className="admin-rentals">
      <section className="admin-page-heading">
        <div>
          <div className="admin-page-eyebrow">
            PROJECTOR RENTALS
          </div>

          <h1>
            Rental <span>Enquiries.</span>
          </h1>

          <p>
            Manage incoming rental enquiries, customer details,
            event requirements and enquiry status.
          </p>
        </div>

        <button
          className="admin-refresh-button"
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            size={15}
            className={
              isRefreshing
                ? "admin-refresh-spin"
                : ""
            }
          />

          {isRefreshing ? "Refreshing" : "Refresh"}
        </button>
      </section>

      <section className="rental-stats-grid">
        <div className="rental-stat-card">
          <span>Total Enquiries</span>
          <strong>{stats.total}</strong>
          <small>All incoming requests</small>
        </div>

        <div className="rental-stat-card rental-stat-new">
          <span>New</span>
          <strong>{stats.new}</strong>
          <small>Needs attention</small>
        </div>

        <div className="rental-stat-card">
          <span>Contacted</span>
          <strong>{stats.contacted}</strong>
          <small>Currently in progress</small>
        </div>

        <div className="rental-stat-card rental-stat-confirmed">
          <span>Confirmed</span>
          <strong>{stats.confirmed}</strong>
          <small>Successful enquiries</small>
        </div>

        <div className="rental-stat-card rental-stat-cancelled">
          <span>Cancelled</span>
          <strong>{stats.cancelled}</strong>
          <small>Cancelled requests</small>
        </div>
      </section>

      <section className="admin-rental-list-section">
        <div className="admin-rental-toolbar">
          <div>
            <h2>Rental Enquiries</h2>
            <p>
              {filteredEnquiries.length} matching{" "}
              {filteredEnquiries.length === 1
                ? "enquiry"
                : "enquiries"}
            </p>
          </div>

          <div className="admin-rental-filters">
            <label className="admin-rental-search">
              <Search size={16} />

              <input
                type="text"
                placeholder="Search name, email or reference..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | "all"
                    | EnquiryStatus
                )
              }
            >
              <option value="all">All statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="admin-empty-state">
            <Clock3 size={23} />
            <strong>Loading rental enquiries...</strong>
            <span>Connecting to CINETARA database.</span>
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="admin-empty-state">
            <Search size={23} />
            <strong>No enquiries found</strong>
            <span>
              Try changing your search or status filter.
            </span>
          </div>
        ) : (
          <div className="admin-enquiries-list">
            {filteredEnquiries.map((enquiry) => (
              <article
                className="admin-enquiry-card"
                key={enquiry.id}
              >
                <div className="admin-enquiry-top">
                  <div>
                    <div className="admin-enquiry-reference">
                      {enquiry.reference_code}
                    </div>

                    <h3>
                      {enquiry.customers?.full_name ||
                        "Unknown customer"}
                    </h3>

                    <span className="admin-enquiry-created">
                      Received{" "}
                      {formatCreatedAt(
                        enquiry.created_at
                      )}
                    </span>
                  </div>

                  <div
                    className={`admin-enquiry-status status-${enquiry.status}`}
                  >
                    {statusLabels[enquiry.status]}
                  </div>
                </div>

                <div className="admin-enquiry-details">
                  <div>
                    <Mail size={15} />

                    <span>
                      {enquiry.customers?.email ||
                        "No email"}
                    </span>
                  </div>

                  <div>
                    <CalendarDays size={15} />

                    <span>
                      {formatDate(
                        enquiry.rental_details
                          ?.preferred_date ?? null
                      )}
                    </span>
                  </div>

                  <div>
                    <MapPin size={15} />

                    <span>
                      {enquiry.rental_details
                        ?.preferred_location ||
                        "Location not specified"}
                    </span>
                  </div>
                </div>

                <div className="admin-enquiry-meta">
                  <div>
                    <span>EVENT</span>
                    <strong>
                      {enquiry.rental_details
                        ?.event_type ||
                        "Not specified"}
                    </strong>
                  </div>

                  <div>
                    <span>DURATION</span>
                    <strong>
                      {enquiry.rental_details
                        ?.expected_duration ||
                        "Not specified"}
                    </strong>
                  </div>

                  <div>
                    <span>BUDGET</span>
                    <strong>
                      {formatBudget(
                        enquiry.rental_details?.budget ??
                          null
                      )}
                    </strong>
                  </div>
                </div>

                {enquiry.message && (
                  <div className="admin-enquiry-message">
                    <span>MESSAGE</span>
                    <p>{enquiry.message}</p>
                  </div>
                )}

                <div className="admin-enquiry-actions">
                  <button
                    type="button"
                    className="enquiry-action contacted"
                    onClick={() =>
                      updateStatus(
                        enquiry.id,
                        "contacted"
                      )
                    }
                    disabled={
                      enquiry.status === "contacted"
                    }
                  >
                    <Clock3 size={14} />
                    Contacted
                  </button>

                  <button
                    type="button"
                    className="enquiry-action confirmed"
                    onClick={() =>
                      updateStatus(
                        enquiry.id,
                        "confirmed"
                      )
                    }
                    disabled={
                      enquiry.status === "confirmed"
                    }
                  >
                    <CheckCircle2 size={14} />
                    Confirm
                  </button>

                  <button
                    type="button"
                    className="enquiry-action cancelled"
                    onClick={() =>
                      updateStatus(
                        enquiry.id,
                        "cancelled"
                      )
                    }
                    disabled={
                      enquiry.status === "cancelled"
                    }
                  >
                    <XCircle size={14} />
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="enquiry-action closed"
                    onClick={() =>
                      updateStatus(
                        enquiry.id,
                        "closed"
                      )
                    }
                    disabled={
                      enquiry.status === "closed"
                    }
                  >
                    Close
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminRentals;