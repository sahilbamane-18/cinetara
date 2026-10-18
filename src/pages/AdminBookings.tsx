import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  Film,
  MapPin,
  RefreshCw,
  Search,
  Ticket,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import "./AdminBookings.css";

type BookingRow = {
  id: string;
  booking_reference: string;
  movie_id: string;
  show_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  people_count: number;
  total_amount: number | string;
  payment_status: string;
  booking_status: string;
  payment_utr: string | null;
  payment_screenshot_path: string | null;
  payment_submitted_at: string | null;
  created_at: string;
};

type MovieRow = { id: string; title: string; poster_url: string | null };
type ShowRow = {
  id: string;
  movie_id: string;
  screen_id: string;
  show_date: string;
  show_time: string;
  base_price: number | string;
  status: string;
};
type ScreenRow = { id: string; name: string; capacity: number };

type BookingView = BookingRow & {
  movie: MovieRow | null;
  show: ShowRow | null;
  screen: ScreenRow | null;
};

type Filter = "review" | "today" | "all";
type ProofState = { type: "image" | "utr"; url?: string; utr?: string };

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatMoney(value: number | string) {
  return money.format(Number(value || 0));
}

function formatDate(date: string | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00+05:30`));
}

function formatTime(time: string | undefined) {
  if (!time) return "—";
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDateTimeIST(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function todayIST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function istDateKey(value: string | null | undefined) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function submittedToday(booking: BookingView) {
  return istDateKey(booking.payment_submitted_at) === todayIST();
}

function formatSubmittedDate(value: string | null | undefined) {
  if (!value) return "Unknown date";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function normalizeStatus(booking: BookingView) {
  if (
    booking.booking_status === "pending" &&
    booking.payment_status === "verification_pending"
  ) {
    return "review";
  }
  if (booking.booking_status === "confirmed") return "confirmed";
  if (booking.booking_status === "rejected") return "rejected";
  if (booking.booking_status === "cancelled") return "cancelled";
  return "pending";
}

function statusLabel(booking: BookingView) {
  const status = normalizeStatus(booking);
  if (status === "review") return "Needs review";
  if (status === "confirmed") return "Confirmed";
  if (status === "rejected") return "Rejected";
  if (status === "cancelled") return "Cancelled";
  return "Pending";
}

function statusClass(booking: BookingView) {
  return `booking-status booking-status-${normalizeStatus(booking)}`;
}

function paymentLabel(booking: BookingView) {
  if (booking.payment_utr && booking.payment_screenshot_path) return "UTR + screenshot";
  if (booking.payment_utr) return "UTR submitted";
  if (booking.payment_screenshot_path) return "Screenshot submitted";
  return "No proof";
}

function AdminBookings() {
  const [bookings, setBookings] = useState<BookingView[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingView | null>(null);
  const [proofState, setProofState] = useState<ProofState | null>(null);
  const [isProofLoading, setIsProofLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadBookings = async () => {
    setIsLoading(true);
    setError("");

    try {
      const { data: bookingData, error: bookingError } = await supabase
        .from("movie_bookings")
        .select(
          "id, booking_reference, movie_id, show_id, customer_name, customer_email, customer_phone, people_count, total_amount, payment_status, booking_status, payment_utr, payment_screenshot_path, payment_submitted_at, created_at"
        )
        .not("payment_submitted_at", "is", null)
        .order("payment_submitted_at", { ascending: false });

      if (bookingError) throw bookingError;

      const rows = (bookingData || []) as BookingRow[];
      const movieIds = [...new Set(rows.map((row) => row.movie_id).filter(Boolean))];
      const showIds = [...new Set(rows.map((row) => row.show_id).filter(Boolean))];

      const [{ data: movies, error: moviesError }, { data: shows, error: showsError }] =
        await Promise.all([
          movieIds.length
            ? supabase.from("movies").select("id, title, poster_url").in("id", movieIds)
            : Promise.resolve({ data: [], error: null }),
          showIds.length
            ? supabase
                .from("shows")
                .select("id, movie_id, screen_id, show_date, show_time, base_price, status")
                .in("id", showIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (moviesError) throw moviesError;
      if (showsError) throw showsError;

      const showRows = (shows || []) as ShowRow[];
      const screenIds = [...new Set(showRows.map((show) => show.screen_id).filter(Boolean))];
      const { data: screens, error: screensError } = screenIds.length
        ? await supabase.from("screens").select("id, name, capacity").in("id", screenIds)
        : { data: [], error: null };

      if (screensError) throw screensError;

      const movieMap = new Map((movies || []).map((movie) => [movie.id, movie as MovieRow]));
      const showMap = new Map(showRows.map((show) => [show.id, show]));
      const screenMap = new Map((screens || []).map((screen) => [screen.id, screen as ScreenRow]));

      setBookings(
        rows.map((row) => {
          const show = showMap.get(row.show_id) || null;
          return {
            ...row,
            movie: movieMap.get(row.movie_id) || null,
            show,
            screen: show ? screenMap.get(show.screen_id) || null : null,
          };
        })
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load CINETARA bookings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBookings();
  }, []);

  const stats = useMemo(() => {
    const review = bookings.filter((booking) => normalizeStatus(booking) === "review").length;
    const today = bookings.filter(submittedToday).length;
    const confirmed = bookings.filter((booking) => normalizeStatus(booking) === "confirmed").length;
    const reservedSeats = bookings
      .filter((booking) => ["review", "confirmed"].includes(normalizeStatus(booking)))
      .reduce((sum, booking) => sum + Number(booking.people_count || 0), 0);

    return { review, today, confirmed, reservedSeats, total: bookings.length };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return bookings.filter((booking) => {
      const status = normalizeStatus(booking);
      if (filter === "review" && status !== "review") return false;
      if (filter === "today" && !submittedToday(booking)) return false;

      if (!query) return true;
      return [
        booking.booking_reference,
        booking.customer_name,
        booking.customer_email,
        booking.customer_phone,
        booking.movie?.title,
        booking.screen?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [bookings, filter, searchTerm]);

  const movieGroups = useMemo(() => {
    const groups = new Map<string, BookingView[]>();
    filteredBookings.forEach((booking) => {
      const key = booking.movie_id;
      groups.set(key, [...(groups.get(key) || []), booking]);
    });

    return [...groups.entries()]
      .map(([movieId, movieBookings]) => {
        const movie = movieBookings[0]?.movie || null;
        return {
          movieId,
          movie,
          bookings: movieBookings,
          reviewCount: movieBookings.filter((booking) => normalizeStatus(booking) === "review").length,
          todayCount: movieBookings.filter(submittedToday).length,
          confirmedCount: movieBookings.filter((booking) => normalizeStatus(booking) === "confirmed").length,
          seats: movieBookings
            .filter((booking) => ["review", "confirmed"].includes(normalizeStatus(booking)))
            .reduce((sum, booking) => sum + Number(booking.people_count || 0), 0),
        };
      })
      .sort((a, b) => {
        if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
        return (a.movie?.title || "").localeCompare(b.movie?.title || "");
      });
  }, [filteredBookings]);

  const selectedMovie = useMemo(
    () => movieGroups.find((group) => group.movieId === selectedMovieId) || null,
    [movieGroups, selectedMovieId]
  );

  const selectedMovieBookings = useMemo(() => {
    if (!selectedMovieId) return [];
    return bookings
      .filter((booking) => {
        if (booking.movie_id !== selectedMovieId) return false;
        if (filter === "review") return normalizeStatus(booking) === "review";
        if (filter === "today") return submittedToday(booking);
        return true;
      })
      .filter((booking) => booking.movie_id === selectedMovieId)
      .sort((a, b) => {
        const aDate = `${a.show?.show_date || "9999"} ${a.show?.show_time || ""}`;
        const bDate = `${b.show?.show_date || "9999"} ${b.show?.show_time || ""}`;
        if (aDate !== bDate) return aDate.localeCompare(bDate);
        return (b.payment_submitted_at || b.created_at).localeCompare(a.payment_submitted_at || a.created_at);
      });
  }, [bookings, selectedMovieId]);

  const selectedMovieDates = useMemo(() => {
    if (!selectedMovieId) return [];

    const dateMap = new Map<string, BookingView[]>();
    selectedMovieBookings.forEach((booking) => {
      const key = istDateKey(booking.payment_submitted_at) || "unknown";
      dateMap.set(key, [...(dateMap.get(key) || []), booking]);
    });

    return [...dateMap.entries()]
      .map(([dateKey, dateBookings]) => {
        const screeningMap = new Map<string, BookingView[]>();
        dateBookings.forEach((booking) => {
          screeningMap.set(booking.show_id, [...(screeningMap.get(booking.show_id) || []), booking]);
        });

        return {
          dateKey,
          bookings: dateBookings,
          screenings: [...screeningMap.values()].sort((a, b) => {
            const aShow = a[0]?.show;
            const bShow = b[0]?.show;
            const aKey = `${aShow?.show_date || "9999"} ${aShow?.show_time || ""}`;
            const bKey = `${bShow?.show_date || "9999"} ${bShow?.show_time || ""}`;
            return aKey.localeCompare(bKey);
          }),
        };
      })
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [selectedMovieBookings, selectedMovieId]);


  const closeDrawer = () => {
    if (reviewingId) return;
    setSelectedBooking(null);
    setProofState(null);
  };

  const openProof = async (booking: BookingView, forceUtr = false) => {
    setIsProofLoading(true);
    setProofState(null);
    try {
      if (!forceUtr && booking.payment_screenshot_path) {
        const { data, error: signedUrlError } = await supabase.storage
          .from("payment-proofs")
          .createSignedUrl(booking.payment_screenshot_path, 300);
        if (signedUrlError) throw signedUrlError;
        if (!data?.signedUrl) throw new Error("Payment screenshot could not be opened.");
        setProofState({ type: "image", url: data.signedUrl });
      } else if (booking.payment_utr) {
        setProofState({ type: "utr", utr: booking.payment_utr });
      } else {
        throw new Error("No payment proof is attached to this booking.");
      }
    } catch (proofError) {
      setError(proofError instanceof Error ? proofError.message : "Unable to open payment proof.");
    } finally {
      setIsProofLoading(false);
    }
  };

  const reviewBooking = async (booking: BookingView, decision: "approve" | "reject") => {
    setReviewingId(booking.id);
    setError("");
    setSuccess("");
    try {
      const { error: reviewError } = await supabase.rpc("admin_review_movie_booking", {
        p_booking_id: booking.id,
        p_decision: decision,
      });
      if (reviewError) throw reviewError;
      setSuccess(
        decision === "approve"
          ? `${booking.booking_reference} is now confirmed.`
          : `${booking.booking_reference} has been rejected.`
      );
      setSelectedBooking(null);
      setProofState(null);
      await loadBookings();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to update this booking.");
    } finally {
      setReviewingId(null);
    }
  };

  const cancelBooking = async (booking: BookingView) => {
    if (!window.confirm(`Cancel ${booking.booking_reference}? This does not process a refund.`)) return;
    setReviewingId(booking.id);
    setError("");
    setSuccess("");
    try {
      const { error: cancelError } = await supabase.rpc("admin_cancel_movie_booking", {
        p_booking_id: booking.id,
      });
      if (cancelError) throw cancelError;
      setSuccess(`${booking.booking_reference} has been cancelled.`);
      setSelectedBooking(null);
      setProofState(null);
      await loadBookings();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Unable to cancel this booking.");
    } finally {
      setReviewingId(null);
    }
  };

  const openMovie = (movieId: string) => {
    setSelectedMovieId(movieId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="admin-bookings-page">
      <header className="admin-bookings-header">
        <div>
          <div className="admin-eyebrow"><Ticket size={14} /> Booking Manager</div>
          <h1>{selectedMovie ? selectedMovie.movie?.title || "Movie bookings" : "Bookings, simplified."}</h1>
          <p>
            {selectedMovie
              ? "Every submitted booking for this movie, organised by screening."
              : "Open a movie to see its bookings. Only customers who actually submitted payment proof appear here."}
          </p>
        </div>
        <button
          type="button"
          className="admin-secondary-button admin-bookings-refresh"
          onClick={() => void loadBookings()}
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? "spin" : ""} /> Refresh
        </button>
      </header>

      {success && (
        <div className="admin-bookings-feedback success"><CheckCircle2 size={16} /><span>{success}</span><button type="button" onClick={() => setSuccess("")}><X size={15} /></button></div>
      )}
      {error && (
        <div className="admin-bookings-feedback error"><AlertCircle size={16} /><span>{error}</span><button type="button" onClick={() => setError("")}><X size={15} /></button></div>
      )}

      {!selectedMovie && (
        <>
          <div className="admin-bookings-stats">
            <article className="booking-stat-card review"><div className="booking-stat-icon"><Clock3 size={18} /></div><div><span>NEEDS REVIEW</span><strong>{stats.review}</strong></div></article>
            <article className="booking-stat-card today"><div className="booking-stat-icon"><CalendarDays size={18} /></div><div><span>BOOKED TODAY</span><strong>{stats.today}</strong></div></article>
            <article className="booking-stat-card confirmed"><div className="booking-stat-icon"><CheckCircle2 size={18} /></div><div><span>CONFIRMED</span><strong>{stats.confirmed}</strong></div></article>
            <article className="booking-stat-card seats"><div className="booking-stat-icon"><Users size={18} /></div><div><span>SEATS RESERVED</span><strong>{stats.reservedSeats}</strong></div></article>
          </div>

          <div className="admin-bookings-toolbar">
            <div className="booking-filter-tabs">
              <button type="button" className={filter === "review" ? "active" : ""} onClick={() => setFilter("review")}>Needs review <b>{stats.review}</b></button>
              <button type="button" className={filter === "today" ? "active" : ""} onClick={() => setFilter("today")}>Booked today <b>{stats.today}</b></button>
              <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All bookings <b>{stats.total}</b></button>
            </div>
            <label className="booking-search"><Search size={16} /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search movie, customer or booking..." /></label>
            <div className="booking-filter-note">Booked today = payment proof submitted today.</div>
          </div>

          {isLoading ? (
            <div className="booking-empty-state"><div className="booking-loading-mark"><RefreshCw size={20} className="spin" /></div><h2>Loading bookings...</h2><p>Preparing the movie booking library.</p></div>
          ) : movieGroups.length === 0 ? (
            <div className="booking-empty-state"><div className="booking-loading-mark"><Film size={20} /></div><h2>{filter === "review" ? "Nothing needs your attention." : filter === "today" ? "No bookings submitted today." : "No movies found."}</h2><p>{filter === "review" ? "Payment-submitted bookings waiting for verification will appear here." : searchTerm ? "Try another search." : filter === "today" ? "Bookings submitted today will appear here, regardless of screening date." : "Submitted payment records will appear here."}</p></div>
          ) : filter !== "all" ? (
            <div className="booking-scroll-list">
              {filteredBookings.map((booking) => (
                <button
                  type="button"
                  className="booking-queue-row"
                  key={booking.id}
                  onClick={() => { setSelectedBooking(booking); setProofState(null); }}
                >
                  <div className="booking-queue-poster">
                    {booking.movie?.poster_url ? (
                      <img src={booking.movie.poster_url} alt="" />
                    ) : (
                      <div className="booking-queue-poster-placeholder"><Film size={16} /></div>
                    )}
                  </div>
                  <div className="booking-queue-main">
                    <span className="booking-queue-ref">{booking.booking_reference}</span>
                    <strong>{booking.movie?.title || "Movie unavailable"}</strong>
                    <small>{booking.customer_name} · {booking.people_count} {booking.people_count === 1 ? "person" : "people"} · {formatMoney(booking.total_amount)}</small>
                  </div>
                  <div className="booking-queue-show">
                    <span>SCREENING</span>
                    <strong>{formatDate(booking.show?.show_date)} · {formatTime(booking.show?.show_time)}</strong>
                    <small>{booking.screen?.name || "Screen unavailable"}</small>
                  </div>
                  <div className="booking-queue-submitted">
                    <span>PROOF SUBMITTED</span>
                    <strong>{formatDateTimeIST(booking.payment_submitted_at)}</strong>
                  </div>
                  <div className="booking-queue-status">
                    <span className={statusClass(booking)}>{statusLabel(booking)}</span>
                    <Eye size={16} />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="movie-booking-library">
              {movieGroups.map((group) => (
                <button type="button" className="movie-booking-card" key={group.movieId} onClick={() => openMovie(group.movieId)}>
                  <div className="movie-poster-wrap">
                    {group.movie?.poster_url ? <img src={group.movie.poster_url} alt="" /> : <div className="movie-poster-placeholder"><Film size={26} /></div>}
                    {group.reviewCount > 0 && <span className="movie-review-badge">{group.reviewCount} review{group.reviewCount === 1 ? "" : "s"}</span>}
                  </div>
                  <div className="movie-booking-card-body">
                    <span className="movie-card-kicker">{group.bookings.length} submitted booking{group.bookings.length === 1 ? "" : "s"}</span>
                    <h2>{group.movie?.title || "Movie unavailable"}</h2>
                    <div className="movie-card-meta"><span>{group.todayCount} booked today</span><span>{group.confirmedCount} confirmed</span></div>
                    <div className="movie-card-footer"><span>{group.seats} seats reserved</span><span>View bookings <ArrowLeft size={14} /></span></div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {selectedMovie && (
        <div className="movie-detail-view">
          <button type="button" className="back-to-movies" onClick={() => setSelectedMovieId(null)}><ArrowLeft size={16} /> All movies</button>

          <div className="movie-detail-hero">
            {selectedMovie.movie?.poster_url ? <img src={selectedMovie.movie.poster_url} alt="" /> : <div className="movie-detail-poster-placeholder"><Film size={26} /></div>}
            <div>
              <span className="movie-card-kicker">BOOKING OVERVIEW</span>
              <h2>{selectedMovie.movie?.title || "Movie unavailable"}</h2>
              <div className="movie-detail-stats"><span>{selectedMovie.bookings.length} bookings</span><span>{selectedMovie.reviewCount} needs review</span><span>{selectedMovie.seats} seats reserved</span></div>
            </div>
          </div>

          {selectedMovieDates.map((dateGroup) => (
            <section className="movie-booking-date-group" key={dateGroup.dateKey}>
              <div className="movie-booking-date-head">
                <div>
                  <span>BOOKED ON</span>
                  <h3>{dateGroup.dateKey === "unknown" ? "Unknown date" : formatSubmittedDate(dateGroup.bookings[0]?.payment_submitted_at)}</h3>
                </div>
                <strong>{dateGroup.bookings.length} ticket booking{dateGroup.bookings.length === 1 ? "" : "s"}</strong>
              </div>

              {dateGroup.screenings.map((screeningBookings) => {
                const first = screeningBookings[0];
                const show = first.show;
                const screen = first.screen;
                const reserved = screeningBookings.filter((booking) => ["review", "confirmed"].includes(normalizeStatus(booking))).reduce((sum, booking) => sum + Number(booking.people_count || 0), 0);
                const reviewCount = screeningBookings.filter((booking) => normalizeStatus(booking) === "review").length;

                return (
                  <article className="movie-screening" key={`${dateGroup.dateKey}-${first.show_id}`}>
                    <div className="movie-screening-head">
                      <div>
                        <span>SHOW · {formatDate(show?.show_date)} · {formatTime(show?.show_time)}</span>
                        <h3>{screen?.name || "Screen unavailable"}</h3>
                      </div>
                      <div className="movie-screening-capacity"><strong>{reserved} / {screen?.capacity || "—"}</strong><span>seats reserved</span>{reviewCount > 0 && <em>{reviewCount} needs review</em>}</div>
                    </div>

                    <div className="movie-booking-list">
                      {screeningBookings.map((booking) => (
                        <button type="button" className="movie-booking-row" key={booking.id} onClick={() => { setSelectedBooking(booking); setProofState(null); }}>
                          <div className="movie-booking-customer"><span>{booking.booking_reference}</span><strong>{booking.customer_name}</strong><small>{booking.customer_email}</small></div>
                          <div className="movie-booking-cell"><span>GROUP</span><strong>{booking.people_count}</strong></div>
                          <div className="movie-booking-cell amount"><span>TOTAL</span><strong>{formatMoney(booking.total_amount)}</strong></div>
                          <div className="movie-booking-cell time">
                            <span>SUBMITTED</span>
                            <strong>{formatDateTimeIST(booking.payment_submitted_at)}</strong>
                          </div>
                          <div className="movie-booking-cell proof"><span>PAYMENT</span><strong>{paymentLabel(booking)}</strong></div>
                          <div className="movie-booking-status"><span className={statusClass(booking)}>{statusLabel(booking)}</span><Eye size={16} /></div>
                        </button>
                      ))}
                    </div>
                  </article>
                );
              })}
            </section>
          ))}
        </div>
      )}

      {selectedBooking && (
        <div className="booking-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDrawer(); }}>
          <aside className="booking-drawer" aria-label="Booking details">
            <div className="booking-drawer-head"><div><span>BOOKING DETAILS</span><h2>{selectedBooking.booking_reference}</h2></div><button type="button" className="drawer-close" onClick={closeDrawer} disabled={!!reviewingId}><X size={18} /></button></div>
            <div className="booking-drawer-scroll">
              <div className="drawer-movie">
                {selectedBooking.movie?.poster_url ? <img src={selectedBooking.movie.poster_url} alt="" /> : <div className="drawer-movie-placeholder"><Film size={20} /></div>}
                <div><span>MOVIE</span><h3>{selectedBooking.movie?.title || "Movie unavailable"}</h3><p>{formatDate(selectedBooking.show?.show_date)} · {formatTime(selectedBooking.show?.show_time)} · {selectedBooking.screen?.name || "Screen unavailable"}</p></div>
              </div>
              <div className="drawer-status-line">
                <span className={statusClass(selectedBooking)}>{statusLabel(selectedBooking)}</span>
                <span>{selectedBooking.payment_submitted_at ? `Proof submitted ${formatDateTimeIST(selectedBooking.payment_submitted_at)}` : paymentLabel(selectedBooking)}</span>
              </div>
              <div className="drawer-section"><span className="drawer-section-label">CUSTOMER</span><div className="drawer-customer"><strong>{selectedBooking.customer_name}</strong><span>{selectedBooking.customer_email}</span><span>{selectedBooking.customer_phone}</span></div></div>
              <div className="drawer-detail-grid"><div><span>GROUP</span><strong>{selectedBooking.people_count} people</strong></div><div><span>TOTAL</span><strong>{formatMoney(selectedBooking.total_amount)}</strong></div></div>
              <div className="drawer-section payment-section">
                <div className="drawer-section-heading"><span className="drawer-section-label">PAYMENT PROOF</span><small>{paymentLabel(selectedBooking)}</small></div>
                {selectedBooking.payment_utr && <div className="utr-box"><span>UTR / TRANSACTION REFERENCE</span><strong>{selectedBooking.payment_utr}</strong><button type="button" className="proof-button compact" onClick={() => void openProof(selectedBooking, true)} disabled={isProofLoading}><Eye size={14} /> VIEW UTR</button></div>}
                {selectedBooking.payment_screenshot_path && <button type="button" className="proof-button" onClick={() => void openProof(selectedBooking)} disabled={isProofLoading}><Eye size={15} />{isProofLoading ? "OPENING PROOF..." : "VIEW PAYMENT SCREENSHOT"}</button>}
              </div>
            </div>
            {normalizeStatus(selectedBooking) === "review" ? (
              <div className="booking-drawer-actions"><button type="button" className="drawer-danger-button" onClick={() => void reviewBooking(selectedBooking, "reject")} disabled={!!reviewingId}><XCircle size={16} />{reviewingId === selectedBooking.id ? "PROCESSING..." : "REJECT PAYMENT"}</button><button type="button" className="drawer-confirm-button" onClick={() => void reviewBooking(selectedBooking, "approve")} disabled={!!reviewingId}><Check size={16} />{reviewingId === selectedBooking.id ? "PROCESSING..." : "CONFIRM PAYMENT"}</button></div>
            ) : normalizeStatus(selectedBooking) === "confirmed" ? (
              <div className="booking-drawer-actions single-action"><button type="button" className="drawer-danger-button" onClick={() => void cancelBooking(selectedBooking)} disabled={!!reviewingId}><XCircle size={16} />CANCEL BOOKING</button></div>
            ) : (
              <div className="drawer-final-state"><span>{statusLabel(selectedBooking).toUpperCase()}</span><p>This booking no longer requires payment verification.</p></div>
            )}
          </aside>
          {proofState && <div className="proof-preview" onMouseDown={(event) => { if (event.target === event.currentTarget) setProofState(null); }}><div className="proof-preview-card"><button type="button" onClick={() => setProofState(null)}><X size={18} /></button><span>PAYMENT PROOF</span>{proofState.type === "image" ? <img src={proofState.url} alt="Customer payment proof" /> : <div className="utr-preview"><Ticket size={30} /><strong>{proofState.utr}</strong><span>UPI transaction reference</span></div>}</div></div>}
        </div>
      )}
    </section>
  );
}

export default AdminBookings;
