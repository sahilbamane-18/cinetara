import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  ExternalLink,
  MapPin,
  Play,
  Ticket,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import "./Movies.css";

type ReleaseStatus = "now_showing" | "coming_soon";

type Movie = {
  id: string;
  title: string;
  genre: string | null;
  language: string | null;
  duration_minutes: number | null;
  rating: string | null;
  description: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  release_status: ReleaseStatus;
  sort_order: number;
  created_at: string;
};

type ShowStatus =
  | "active"
  | "sold_out"
  | "cancelled"
  | "completed";

type Screen = {
  id: string;
  name: string;
  capacity: number;
  google_maps_url: string | null;
};

type Show = {
  id: string;
  movie_id: string;
  screen_id: string;
  show_date: string;
  show_time: string;
  base_price: number;
  status: ShowStatus;
  screen: Screen | null;
};

type ShowAvailability = {
  show_id: string;
  capacity: number;
  occupied_people: number;
  remaining_capacity: number;
  sold_out: boolean;
};

type ShowGroupPrice = {
  id: string;
  show_id: string;
  group_size: number;
  price_per_person: number;
};

type HeroPhase = "visible" | "covering" | "revealing";
type BookingStep = "selection" | "details" | "payment" | "created";

type BookingResult = {
  booking_id: string;
  booking_reference: string;
  movie_title: string;
  show_date: string;
  show_time: string;
  screen_name: string;
  people_count: number;
  total_amount: number;
  booking_status: string;
  payment_status: string;
  expires_at: string | null;
};

function formatDuration(minutes: number | null) {
  if (!minutes || minutes <= 0) {
    return "Duration TBA";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function getReleaseLabel(status: ReleaseStatus) {
  return status === "now_showing" ? "NOW SHOWING" : "COMING SOON";
}

function getMovieImage(movie: Movie) {
  return movie.poster_url || movie.backdrop_url || "";
}

function getMovieBackdrop(movie: Movie) {
  return movie.backdrop_url || movie.poster_url || "";
}

function formatShowTime(time: string) {
  const [hoursString, minutes] = time.split(":");
  const hours = Number(hoursString);

  if (Number.isNaN(hours)) {
    return time;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${minutes} ${period}`;
}

function formatShowDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(parsed);
}

function getDateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  const today = new Date();

  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const tomorrow = new Date(today);

  tomorrow.setDate(today.getDate() + 1);

  const tomorrowKey = [
    tomorrow.getFullYear(),
    String(tomorrow.getMonth() + 1).padStart(2, "0"),
    String(tomorrow.getDate()).padStart(2, "0"),
  ].join("-");

  if (date === todayKey) {
    return "TODAY";
  }

  if (date === tomorrowKey) {
    return "TOMORROW";
  }

  return formatShowDate(date).toUpperCase();
}

function isShowInThePast(show: Show) {
  const showDateTime = new Date(
    `${show.show_date}T${show.show_time}`
  );

  return showDateTime.getTime() < Date.now();
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

const CINETARA_UPI_ID =
  import.meta.env.VITE_CINETARA_UPI_ID || "";

const CINETARA_UPI_NAME =
  import.meta.env.VITE_CINETARA_UPI_NAME || "CINETARA";

const PAYMENT_PROOF_BUCKET = "payment-proofs";
const PAYMENT_PROOF_MAX_BYTES = 5 * 1024 * 1024;

function Movies() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [showAvailability, setShowAvailability] =
    useState<Record<string, ShowAvailability>>({});
  const [showGroupPrices, setShowGroupPrices] =
    useState<Record<string, ShowGroupPrice[]>>({});

  const [selectedMovie, setSelectedMovie] =
    useState<Movie | null>(null);

  const [selectedShowId, setSelectedShowId] =
    useState<string | null>(null);

  const [groupSize, setGroupSize] = useState(1);

  const [bookingStep, setBookingStep] =
    useState<BookingStep>("selection");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [bookingResult, setBookingResult] =
    useState<BookingResult | null>(null);
  const [bookingError, setBookingError] = useState("");
  const [isCreatingBooking, setIsCreatingBooking] =
    useState(false);
  const [isRefreshingAvailability, setIsRefreshingAvailability] =
    useState(false);

  const [paymentUtr, setPaymentUtr] = useState("");
  const [paymentScreenshot, setPaymentScreenshot] =
    useState<File | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] =
    useState(false);

  const [selectionAnimatingId, setSelectionAnimatingId] =
    useState<string | null>(null);

  const [activeTab, setActiveTab] =
    useState<"now" | "soon">("now");

  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPhase, setHeroPhase] =
    useState<HeroPhase>("visible");

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const transitionTimerRef =
    useRef<number | null>(null);

  const revealFrameOneRef =
    useRef<number | null>(null);

  const revealFrameTwoRef =
    useRef<number | null>(null);

  const selectionTimerRef =
    useRef<number | null>(null);

  /*
   * LOAD MOVIES + PUBLIC SHOWS
   */
  useEffect(() => {
    let isMounted = true;

    async function loadMoviesAndShows() {
      setIsLoading(true);
      setLoadError("");

      const [
        { data: movieData, error: movieError },
        { data: showData, error: showError },
        {
          data: groupPriceData,
          error: groupPriceError,
        },
      ] = await Promise.all([
        supabase
          .from("movies")
          .select(
            `
              id,
              title,
              genre,
              language,
              duration_minutes,
              rating,
              description,
              poster_url,
              backdrop_url,
              release_status,
              sort_order,
              created_at
            `
          )
          .in("release_status", [
            "now_showing",
            "coming_soon",
          ])
          .order("sort_order", {
            ascending: true,
          })
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("shows")
          .select(
            `
              id,
              movie_id,
              screen_id,
              show_date,
              show_time,
              base_price,
              status,
              screen:screens (
                id,
                name,
                capacity,
                google_maps_url
              )
            `
          )
          .in("status", [
            "active",
            "sold_out",
          ])
          .order("show_date", {
            ascending: true,
          })
          .order("show_time", {
            ascending: true,
          }),

        supabase
          .from("show_group_prices")
          .select(
            `
              id,
              show_id,
              group_size,
              price_per_person
            `
          )
          .order("group_size", {
            ascending: true,
          }),
      ]);

      if (!isMounted) {
        return;
      }

      if (movieError) {
        console.error(
          "Failed to load movies:",
          movieError
        );

        setLoadError(
          "We could not load the movie library right now. Please try again."
        );

        setMovies([]);
        setShows([]);
        setIsLoading(false);

        return;
      }

      if (showError) {
        console.error(
          "Failed to load shows:",
          showError
        );

        setLoadError(
          "We could not load the screening schedule right now. Please try again."
        );

        setMovies(
          (movieData ?? []) as Movie[]
        );

        setShows([]);
        setIsLoading(false);

        return;
      }

      if (groupPriceError) {
        console.warn(
          "Failed to load show group pricing. Falling back to the 1-person show price.",
          groupPriceError
        );
      }

      const normalizedShows: Show[] = (
        (showData ?? []) as Show[]
      ).map((show) => {
        let screen: Screen | null = null;

        if (Array.isArray(show.screen)) {
          screen = show.screen[0] ?? null;
        } else if (show.screen) {
          screen = show.screen;
        }

        return {
          ...show,
          screen,
          base_price: Number(show.base_price),
        };
      });

      setMovies(
        (movieData ?? []) as Movie[]
      );

      const groupedPrices: Record<
        string,
        ShowGroupPrice[]
      > = {};

      ((groupPriceData ?? []) as ShowGroupPrice[]).forEach(
        (price) => {
          const normalizedPrice = {
            ...price,
            group_size: Number(price.group_size),
            price_per_person: Number(
              price.price_per_person
            ),
          };

          if (!groupedPrices[price.show_id]) {
            groupedPrices[price.show_id] = [];
          }

          groupedPrices[price.show_id].push(
            normalizedPrice
          );
        }
      );

      Object.keys(groupedPrices).forEach(
        (showId) => {
          groupedPrices[showId].sort(
            (a, b) =>
              a.group_size - b.group_size
          );
        }
      );

      setShows(normalizedShows);
      setShowGroupPrices(groupedPrices);
      setIsLoading(false);
    }

    loadMoviesAndShows();

    return () => {
      isMounted = false;
    };
  }, []);

  /*
   * LIVE SHOW AVAILABILITY
   *
   * Booking rows never expose movie_bookings directly.
   * The public RPC returns only safe capacity information.
   */
  useEffect(() => {
    if (shows.length === 0) {
      setShowAvailability({});
      return;
    }

    let isMounted = true;

    async function loadShowAvailability() {
      const results = await Promise.all(
        shows.map(async (show) => {
          const { data, error } = await supabase.rpc(
            "get_movie_show_availability",
            {
              p_show_id: show.id,
            }
          );

          if (error) {
            console.warn(
              `Could not load availability for show ${show.id}:`,
              error
            );
            return null;
          }

          return data as ShowAvailability;
        })
      );

      if (!isMounted) {
        return;
      }

      const nextAvailability: Record<string, ShowAvailability> = {};

      results.forEach((availability) => {
        if (availability?.show_id) {
          nextAvailability[availability.show_id] = {
            ...availability,
            capacity: Number(availability.capacity),
            occupied_people: Number(availability.occupied_people),
            remaining_capacity: Number(availability.remaining_capacity),
            sold_out: Boolean(availability.sold_out),
          };
        }
      });

      setShowAvailability(nextAvailability);
    }

    loadShowAvailability();

    return () => {
      isMounted = false;
    };
  }, [shows]);

  /*
   * REFRESH ONE SHOW AVAILABILITY
   *
   * This is used immediately before moving into booking,
   * immediately before creating a booking, and after the
   * booking RPC succeeds/fails. The UI is helpful, but the
   * database RPC remains the final authority on capacity.
   */
  const refreshShowAvailability = async (
    showId: string
  ): Promise<ShowAvailability | null> => {
    const { data, error } = await supabase.rpc(
      "get_movie_show_availability",
      {
        p_show_id: showId,
      }
    );

    if (error) {
      console.warn(
        `Could not refresh availability for show ${showId}:`,
        error
      );
      return null;
    }

    const availability = data as ShowAvailability;

    if (!availability?.show_id) {
      return null;
    }

    const normalizedAvailability: ShowAvailability = {
      ...availability,
      capacity: Number(availability.capacity),
      occupied_people: Number(availability.occupied_people),
      remaining_capacity: Number(availability.remaining_capacity),
      sold_out: Boolean(availability.sold_out),
    };

    setShowAvailability((current) => ({
      ...current,
      [showId]: normalizedAvailability,
    }));

    return normalizedAvailability;
  };

  /*
   * NOW SHOWING MOVIES
   */
  const nowShowingMovies = useMemo(
    () =>
      movies.filter(
        (movie) =>
          movie.release_status === "now_showing"
      ),
    [movies]
  );

  const comingSoonMovies = useMemo(
    () =>
      movies.filter(
        (movie) =>
          movie.release_status === "coming_soon"
      ),
    [movies]
  );

  const heroMovies = useMemo(
    () =>
      [...nowShowingMovies, ...comingSoonMovies],
    [nowShowingMovies, comingSoonMovies]
  );

  /*
   * MOVIES VISIBLE IN CURRENT TAB
   */
  const visibleMovies = useMemo(
    () =>
      movies.filter((movie) =>
        activeTab === "now"
          ? movie.release_status === "now_showing"
          : movie.release_status === "coming_soon"
      ),
    [movies, activeTab]
  );

  /*
   * SHOWS FOR SELECTED MOVIE
   *
   * Only active/sold-out future screenings
   * are displayed.
   */
  const selectedMovieShows = useMemo(() => {
    if (!selectedMovie) {
      return [];
    }

    return shows
      .filter(
        (show) =>
          show.movie_id === selectedMovie.id &&
          !isShowInThePast(show)
      )
      .sort((a, b) => {
        const first = new Date(
          `${a.show_date}T${a.show_time}`
        ).getTime();

        const second = new Date(
          `${b.show_date}T${b.show_time}`
        ).getTime();

        return first - second;
      });
  }, [selectedMovie, shows]);

  /*
   * GROUP SHOWS BY DATE
   */
  const groupedSelectedShows = useMemo(() => {
    const groups = new Map<string, Show[]>();

    selectedMovieShows.forEach((show) => {
      const existing = groups.get(
        show.show_date
      );

      if (existing) {
        existing.push(show);
      } else {
        groups.set(show.show_date, [show]);
      }
    });

    return Array.from(groups.entries()).map(
      ([date, dateShows]) => ({
        date,
        shows: dateShows,
      })
    );
  }, [selectedMovieShows]);

  /*
   * KEEP HERO INDEX VALID
   */
  useEffect(() => {
    if (heroMovies.length === 0) {
      setHeroIndex(0);
      return;
    }

    setHeroIndex(
      (current) => current % heroMovies.length
    );
  }, [heroMovies.length]);

  const heroMovie =
    heroMovies.length > 0
      ? heroMovies[heroIndex % heroMovies.length]
      : null;

  /*
   * PRELOAD HERO ART
   */
  useEffect(() => {
    heroMovies.forEach((movie) => {
      const backdrop =
        getMovieBackdrop(movie);

      if (backdrop) {
        const backdropImage =
          new Image();

        backdropImage.src = backdrop;
      }

      const poster =
        getMovieImage(movie);

      if (poster) {
        const posterImage =
          new Image();

        posterImage.src = poster;
      }
    });
  }, [heroMovies]);

  /*
   * HERO TRANSITION
   */
  useEffect(() => {
    if (heroMovies.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setHeroPhase("covering");

      transitionTimerRef.current =
        window.setTimeout(() => {
          setHeroIndex((current) => {
            return (
              (current + 1) %
              heroMovies.length
            );
          });

          revealFrameOneRef.current =
            window.requestAnimationFrame(() => {
              revealFrameTwoRef.current =
                window.requestAnimationFrame(() => {
                  setHeroPhase("revealing");
                });
            });
        }, 520);
    }, 6000);

    return () => {
      window.clearInterval(interval);

      if (
        transitionTimerRef.current !== null
      ) {
        window.clearTimeout(
          transitionTimerRef.current
        );
      }

      if (
        revealFrameOneRef.current !== null
      ) {
        window.cancelAnimationFrame(
          revealFrameOneRef.current
        );
      }

      if (
        revealFrameTwoRef.current !== null
      ) {
        window.cancelAnimationFrame(
          revealFrameTwoRef.current
        );
      }
    };
  }, [heroMovies.length]);

  /*
   * SCROLL TO MOVIE LIST
   */
  const openMovieList = () => {
    const section =
      document.getElementById(
        "movie-list"
      );

    if (!section) {
      return;
    }

    const target =
      section.getBoundingClientRect()
        .top +
      window.scrollY -
      20;

    window.scrollTo({
      top: Math.max(target, 0),
      behavior: "smooth",
    });
  };

  /*
   * OPEN MOVIE MODAL
   */
  const openMovie = (movie: Movie) => {
    setSelectedMovie(movie);
    setSelectedShowId(null);
    setGroupSize(1);
    setSelectionAnimatingId(null);
    setBookingStep("selection");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setBookingResult(null);
    setBookingError("");
    setPaymentUtr("");
    setPaymentScreenshot(null);
    setIsSubmittingPayment(false);
  };

  /*
   * CLOSE MOVIE MODAL
   */
  const closeMovie = () => {
    setSelectedMovie(null);
    setSelectedShowId(null);
    setGroupSize(1);
    setSelectionAnimatingId(null);
    setBookingStep("selection");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setBookingResult(null);
    setBookingError("");
    setPaymentUtr("");
    setPaymentScreenshot(null);
    setIsSubmittingPayment(false);

    if (
      selectionTimerRef.current !== null
    ) {
      window.clearTimeout(
        selectionTimerRef.current
      );

      selectionTimerRef.current = null;
    }
  };

  /*
   * MODAL ESCAPE / BODY LOCK
   */
  useEffect(() => {
    if (!selectedMovie) {
      return;
    }

    const handleEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        closeMovie();
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    document.body.style.overflow =
      "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );

      document.body.style.overflow = "";

      if (
        selectionTimerRef.current !== null
      ) {
        window.clearTimeout(
          selectionTimerRef.current
        );
      }
    };
  }, [selectedMovie]);

  /*
   * SHOW SELECTION
   *
   * The animation is deliberately short:
   *
   * 1. Ticket jumps
   * 2. Card flashes
   * 3. Card becomes CINETARA red
   * 4. Selected time + price remain visible
   */
  const handleShowSelect = (
    show: Show
  ) => {
    const availability = showAvailability[show.id];

    if (
      availability?.sold_out ||
      availability?.remaining_capacity === 0 ||
      show.status === "sold_out" && !availability
    ) {
      return;
    }

    if (
      selectionTimerRef.current !== null
    ) {
      window.clearTimeout(
        selectionTimerRef.current
      );
    }

    setSelectedShowId(show.id);
    setGroupSize(1);
    setBookingError("");
    setSelectionAnimatingId(show.id);

    selectionTimerRef.current =
      window.setTimeout(() => {
        setSelectionAnimatingId(null);
        selectionTimerRef.current = null;
      }, 720);
  };

  const selectedShow =
    selectedMovieShows.find(
      (show) =>
        show.id === selectedShowId
    );

  const selectedAvailability =
    selectedShow
      ? showAvailability[selectedShow.id] ?? null
      : null;

  const selectedRemainingSeats =
    selectedAvailability?.remaining_capacity ?? 0;

  const selectedShowIsSoldOut =
    Boolean(
      selectedAvailability?.sold_out ||
      selectedAvailability?.remaining_capacity === 0 ||
      (selectedShow?.status === "sold_out" &&
        !selectedAvailability)
    );

  /*
   * GROUP PACKAGE PRICING
   *
   * The customer gets the largest configured package
   * that fits their group. Any people beyond that package
   * use the 1-person price until another package is reached.
   *
   * Example:
   * 1 → ₹300
   * 4 → ₹250
   * 6 → ₹100
   *
   * 6 people = 6 × ₹100
   * 7 people = (6 × ₹100) + (1 × ₹300)
   */
  const selectedShowPackages = useMemo(() => {
    if (!selectedShow) {
      return [];
    }

    return showGroupPrices[selectedShow.id] || [
      {
        id: `${selectedShow.id}-base`,
        show_id: selectedShow.id,
        group_size: 1,
        price_per_person: selectedShow.base_price,
      },
    ];
  }, [selectedShow, showGroupPrices]);

  const singlePersonPrice =
    selectedShowPackages.find(
      (packagePrice) =>
        packagePrice.group_size === 1
    )?.price_per_person ??
    selectedShow?.base_price ??
    0;

  const applicableGroupPackage = useMemo(() => {
    if (!selectedShow) {
      return null;
    }

    return (
      selectedShowPackages
        .filter(
          (packagePrice) =>
            packagePrice.group_size <= groupSize
        )
        .sort(
          (a, b) =>
            b.group_size - a.group_size
        )[0] || {
        id: `${selectedShow.id}-base`,
        show_id: selectedShow.id,
        group_size: 1,
        price_per_person: singlePersonPrice,
      }
    );
  }, [
    selectedShow,
    selectedShowPackages,
    groupSize,
    singlePersonPrice,
  ]);

  const packageExtraPeople =
    applicableGroupPackage
      ? Math.max(
          groupSize -
            applicableGroupPackage.group_size,
          0
        )
      : groupSize;

  const selectedTotal =
    applicableGroupPackage
      ? applicableGroupPackage.group_size *
          applicableGroupPackage.price_per_person +
        packageExtraPeople * singlePersonPrice
      : groupSize * singlePersonPrice;

  const selectedPerPersonEffective =
    groupSize > 0
      ? selectedTotal / groupSize
      : singlePersonPrice;

  const continueToBooking = async () => {
    if (!selectedMovie || !selectedShow) {
      return;
    }

    if (selectedMovie.release_status !== "now_showing") {
      setBookingError(
        "This movie is coming soon and cannot be booked yet."
      );
      return;
    }

    if (isRefreshingAvailability) {
      return;
    }

    setBookingError("");
    setIsRefreshingAvailability(true);

    const freshAvailability =
      await refreshShowAvailability(selectedShow.id);

    setIsRefreshingAvailability(false);

    if (!freshAvailability) {
      setBookingError(
        "We could not refresh seat availability. Please try again."
      );
      return;
    }

    if (
      freshAvailability.sold_out ||
      freshAvailability.remaining_capacity <= 0
    ) {
      setGroupSize(1);
      setBookingError(
        "This screening has just sold out. Please choose another show."
      );
      return;
    }

    if (
      groupSize >
      freshAvailability.remaining_capacity
    ) {
      setBookingError(
        `Only ${freshAvailability.remaining_capacity} ${freshAvailability.remaining_capacity === 1 ? "seat is" : "seats are"} currently available. Please reduce your group size to continue.`
      );
      return;
    }

    setBookingStep("details");
  };

  const createBooking = async () => {
    if (!selectedMovie || !selectedShow) {
      return;
    }

    setBookingError("");

    if (
      !customerName.trim() ||
      !customerEmail.trim() ||
      !customerPhone.trim()
    ) {
      setBookingError(
        "Please complete your name, email and phone number."
      );
      return;
    }

    const normalizedEmail = customerEmail.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setBookingError(
        "Enter a valid email address, for example name@gmail.com."
      );
      return;
    }

    const normalizedPhone = customerPhone.replace(/\D/g, "");

    if (!/^\d{10}$/.test(normalizedPhone)) {
      setBookingError(
        "Enter a valid 10-digit mobile number."
      );
      return;
    }

    setIsCreatingBooking(true);

    /*
     * The customer may have stayed on the details step while
     * another customer booked seats. Refresh once more before
     * calling the authoritative booking RPC.
     */
    const freshAvailability =
      await refreshShowAvailability(selectedShow.id);

    if (!freshAvailability) {
      setBookingError(
        "We could not verify the latest seat availability. Please try again."
      );
      setIsCreatingBooking(false);
      return;
    }

    if (
      freshAvailability.sold_out ||
      freshAvailability.remaining_capacity <= 0
    ) {
      setBookingError(
        "This screening has just sold out. Please choose another show."
      );
      setBookingStep("selection");
      setGroupSize(1);
      setIsCreatingBooking(false);
      return;
    }

    if (
      groupSize >
      freshAvailability.remaining_capacity
    ) {
      setBookingError(
        `Only ${freshAvailability.remaining_capacity} ${freshAvailability.remaining_capacity === 1 ? "seat is" : "seats are"} now available. Please reduce your group size.`
      );
      setBookingStep("selection");
      setIsCreatingBooking(false);
      return;
    }

    const { data, error } = await supabase.rpc(
      "create_movie_booking",
      {
        p_show_id: selectedShow.id,
        p_customer_name: customerName.trim(),
        p_customer_email: normalizedEmail,
        p_customer_phone: normalizedPhone,
        p_people_count: groupSize,
      }
    );

    if (error) {
      console.error(
        "Failed to create movie booking:",
        error
      );

      /*
       * A second customer can win the race between our fresh
       * check and the database transaction. Refresh immediately
       * so the UI moves to the real current state.
       */
      const latestAvailability =
        await refreshShowAvailability(
          selectedShow.id
        );

      if (
        latestAvailability?.sold_out ||
        latestAvailability?.remaining_capacity === 0
      ) {
        setBookingError(
          "This screening has just sold out. Please choose another show."
        );
        setBookingStep("selection");
        setGroupSize(1);
      } else if (
        latestAvailability &&
        groupSize >
          latestAvailability.remaining_capacity
      ) {
        setBookingError(
          `Only ${latestAvailability.remaining_capacity} ${latestAvailability.remaining_capacity === 1 ? "seat is" : "seats are"} now available. Please reduce your group size or choose another show.`
        );
        setBookingStep("selection");
      } else {
        const message =
          error.message?.toLowerCase() || "";

        setBookingError(
          message.includes("not available")
            ? "This movie is not available for booking yet."
            : message.includes("capacity")
              ? "There are not enough seats remaining for this group. Please reduce the group size or choose another show."
              : error.message ||
                "We could not create your booking. Please try again."
        );
      }

      setIsCreatingBooking(false);
      return;
    }

    const result = data as BookingResult;

    /*
     * The booking hold now consumes capacity. Refresh the show
     * immediately so the selected show and People selector show
     * the new remaining count without a page reload.
     */
    await refreshShowAvailability(selectedShow.id);

    setBookingResult(result);
    setPaymentUtr("");
    setPaymentScreenshot(null);
    setBookingStep("payment");
    setIsCreatingBooking(false);
  };

  const upiPaymentUrl = useMemo(() => {
    if (!CINETARA_UPI_ID || !bookingResult) {
      return "";
    }

    const params = new URLSearchParams({
      pa: CINETARA_UPI_ID,
      pn: CINETARA_UPI_NAME,
      am: Number(bookingResult.total_amount).toFixed(2),
      cu: "INR",
      tn: `CINETARA ${bookingResult.booking_reference}`,
    });

    return `upi://pay?${params.toString()}`;
  }, [bookingResult]);

  const copyUpiId = async () => {
    if (!CINETARA_UPI_ID) {
      return;
    }

    try {
      await navigator.clipboard.writeText(CINETARA_UPI_ID);
      setBookingError("UPI ID copied. Open your UPI app and complete the payment.");
    } catch {
      setBookingError("Copy is unavailable here. Please use the UPI ID shown above.");
    }
  };

  const openUpiPayment = () => {
    if (!upiPaymentUrl) {
      setBookingError(
        "CINETARA UPI payment is not configured yet."
      );
      return;
    }

    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(
      navigator.userAgent
    );

    if (!isMobileDevice) {
      setBookingError(
        "UPI app links open on a phone with a UPI app. Please open CINETARA on your phone to continue the payment."
      );
      return;
    }

    window.location.href = upiPaymentUrl;
  };

  const submitPaymentProof = async () => {
    if (!bookingResult) {
      return;
    }

    setBookingError("");

    const normalizedUtr = paymentUtr.trim();

    if (!normalizedUtr && !paymentScreenshot) {
      setBookingError("Enter the UTR / transaction reference or upload the payment screenshot.");
      return;
    }

    if (normalizedUtr && !/^\d{12}$/.test(normalizedUtr)) {
      setBookingError("UTR / transaction reference must be exactly 12 digits.");
      return;
    }

    if (paymentScreenshot && !paymentScreenshot.type.startsWith("image/")) {
      setBookingError("Payment proof must be a JPG, PNG or WEBP image.");
      return;
    }

    if (paymentScreenshot && paymentScreenshot.size > PAYMENT_PROOF_MAX_BYTES) {
      setBookingError("Payment screenshot must be 5 MB or smaller.");
      return;
    }

    if (!CINETARA_UPI_ID) {
      setBookingError("CINETARA UPI payment is not configured yet. Add VITE_CINETARA_UPI_ID to .env.local.");
      return;
    }

    setIsSubmittingPayment(true);

    let storagePath: string | null = null;

    if (paymentScreenshot) {
      const extension =
        paymentScreenshot.name.split(".").pop()?.toLowerCase() || "jpg";

      const safeFileName =
        paymentScreenshot.name
          .replace(/[^a-zA-Z0-9._-]/g, "-")
          .replace(/-+/g, "-")
          .slice(-80);

      storagePath =
        `${bookingResult.booking_id}/${Date.now()}-${safeFileName || `payment-proof.${extension}`}`;

      const { error: uploadError } = await supabase.storage
        .from(PAYMENT_PROOF_BUCKET)
        .upload(storagePath, paymentScreenshot, {
          cacheControl: "3600",
          upsert: false,
          contentType: paymentScreenshot.type,
        });

      if (uploadError) {
        console.error("Failed to upload payment proof:", uploadError);
        setBookingError(
          uploadError.message?.toLowerCase().includes("bucket")
            ? "Payment proof storage is not configured yet. Please contact CINETARA."
            : "We could not upload the payment screenshot. Please try again."
        );
        setIsSubmittingPayment(false);
        return;
      }
    }

    const { error: proofError } = await supabase.rpc(
      "submit_movie_payment_proof",
      {
        p_booking_id: bookingResult.booking_id,
        p_payment_utr: normalizedUtr,
        p_payment_screenshot_path: storagePath,
      }
    );

    if (proofError) {
      console.error("Failed to submit movie payment proof:", proofError);
      setBookingError(
        proofError.message ||
          "We could not submit your payment proof. Please try again."
      );
      setIsSubmittingPayment(false);
      return;
    }

    setBookingStep("created");
    setIsSubmittingPayment(false);
  };

  const heroArtClass = [
    "movies-hero-art-image",
    `hero-phase-${heroPhase}`,
  ].join(" ");

  const heroFeatureClass = [
    "movies-hero-feature",
    heroPhase === "covering"
      ? "is-changing"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="movies-page">
      {/* =====================================================
          TOP BAR
      ===================================================== */}

      <header className="movies-topbar">
        <a
          className="movies-brand"
          href="/"
          aria-label="CINETARA home"
        >
          <img
            src="/cinetara-logo.png"
            alt="CINETARA"
          />
        </a>

        <a
          className="movies-back-link"
          href="/"
          aria-label="Back to CINETARA home"
        >
          <span>
            BACK TO CINETARA
          </span>

          <ArrowRight size={16} />
        </a>
      </header>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="movies-hero">
        <div className="movies-hero-content">
          <p className="movies-eyebrow">
            CINETARA · THE BIG SCREEN
          </p>

          <h1>
            STORIES
            <br />
            <span>WORTH WATCHING.</span>
          </h1>

          <p className="movies-hero-copy">
            Choose your film, pick your show,
            and let CINETARA take care of the
            rest.
          </p>

          <button
            className="movies-hero-button"
            type="button"
            onClick={openMovieList}
          >
            EXPLORE MOVIES
            <ArrowRight size={15} />
          </button>

          {heroMovie && (
            <div
              className={
                heroFeatureClass
              }
            >
              <span>
                {getReleaseLabel(heroMovie.release_status)}
              </span>

              <strong>
                {heroMovie.title}
              </strong>
            </div>
          )}
        </div>

        <div
          className="movies-hero-art"
          aria-hidden="true"
        >
          {heroMovie ? (
            <>
              <div
                className={
                  heroArtClass
                }
                style={{
                  backgroundImage: `url("${getMovieBackdrop(
                    heroMovie
                  )}"), url("${getMovieImage(
                    heroMovie
                  )}")`,
                }}
              />

              <div
                className={`movies-hero-transition-overlay hero-phase-${heroPhase}`}
              />

              <div className="movies-hero-vignette" />

              <div className="movies-hero-dots">
                {heroMovies.map(
                  (
                    movie,
                    index
                  ) => (
                    <span
                      key={movie.id}
                      className={
                        index ===
                        heroIndex %
                          heroMovies.length
                          ? "active"
                          : ""
                      }
                    />
                  )
                )}
              </div>
            </>
          ) : (
            <div className="movies-hero-empty-art" />
          )}
        </div>
      </section>

      {/* =====================================================
          MOVIE LIST
      ===================================================== */}

      <section
        className="movies-list-section"
        id="movie-list"
      >
        <div className="movies-section-heading">
          <div>
            <p className="movies-eyebrow">
              WHAT&apos;S PLAYING
            </p>

            <h2>
              Choose your story.
            </h2>
          </div>

          <div
            className="movies-tabs"
            role="tablist"
            aria-label="Movie selection"
          >
            <button
              className={
                activeTab === "now"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("now")
              }
              type="button"
            >
              NOW SHOWING
            </button>

            <button
              className={
                activeTab === "soon"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("soon")
              }
              type="button"
            >
              COMING SOON
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="movies-state">
            <div className="movies-state-loader" />

            <p>
              LOADING CINETARA...
            </p>
          </div>
        ) : loadError ? (
          <div className="movies-state movies-state-error">
            <p>{loadError}</p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
            >
              TRY AGAIN
            </button>
          </div>
        ) : visibleMovies.length === 0 ? (
          <div className="movies-state">
            <p>
              {activeTab === "now"
                ? "No movies are currently showing."
                : "No upcoming movies have been announced yet."}
            </p>
          </div>
        ) : (
          <div className="movie-grid">
            {visibleMovies.map(
              (movie) => {
                const image =
                  getMovieImage(movie);

                const movieShows =
                  shows.filter(
                    (show) =>
                      show.movie_id ===
                        movie.id &&
                      !isShowInThePast(
                        show
                      )
                  );

                return (
                  <article
                    className="movie-card"
                    key={movie.id}
                  >
                    <button
                      className="movie-poster-button"
                      type="button"
                      onClick={() =>
                        openMovie(movie)
                      }
                      aria-label={`Open ${movie.title}`}
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={`${movie.title} poster`}
                          loading="lazy"
                        />
                      ) : (
                        <div className="movie-poster-fallback">
                          <span>
                            CINETARA
                          </span>
                        </div>
                      )}

                      <span className="movie-card-shade" />

                      <span className="movie-card-status">
                        {getReleaseLabel(
                          movie.release_status
                        )}
                      </span>

                      <span className="movie-play">
                        <Play
                          size={17}
                          fill="currentColor"
                        />
                      </span>
                    </button>

                    <div className="movie-card-info">
                      <div>
                        <h3>
                          {movie.title}
                        </h3>

                        <p>
                          {movie.genre ||
                            "Genre TBA"}
                        </p>
                      </div>

                      {movie.rating && (
                        <span className="movie-rating">
                          {movie.rating}
                        </span>
                      )}
                    </div>

                    <div className="movie-meta">
                      <span>
                        {movie.language ||
                          "Language TBA"}
                      </span>

                      <span>
                        {formatDuration(
                          movie.duration_minutes
                        )}
                      </span>

                      {movieShows.length >
                        0 && (
                        <span>
                          {
                            movieShows.length
                          }{" "}
                          {movieShows.length ===
                          1
                            ? "SHOW"
                            : "SHOWS"}
                        </span>
                      )}
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      {/* =====================================================
          EXPERIENCE
      ===================================================== */}

      <section className="movies-experience">
        <div>
          <p className="movies-eyebrow">
            MORE THAN A SCREEN
          </p>

          <h2>
            Make it a
            <br />
            <span>
              cinematic night.
            </span>
          </h2>
        </div>

        <p>
          Premium cinema, carefully chosen
          films, comfortable spaces and a
          place to make the ordinary night
          feel a little bigger.
        </p>
      </section>

      {/* =====================================================
          MOVIE DETAILS + SHOW SELECTION MODAL
      ===================================================== */}

      {selectedMovie && (
        <div
          className="movie-modal-backdrop"
          onClick={closeMovie}
        >
          <div
            className="movie-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedMovie.title} details`}
          >
            <button
              className="movie-modal-close"
              type="button"
              onClick={closeMovie}
              aria-label="Close movie details"
            >
              <X size={19} />
            </button>

            {/* MOVIE ART */}

            <div
              className="movie-modal-backdrop-image"
              style={{
                backgroundImage: `url("${getMovieBackdrop(
                  selectedMovie
                )}"), url("${getMovieImage(
                  selectedMovie
                )}")`,
              }}
            />

            {/* MOVIE INFORMATION */}

            <div className={`movie-modal-content ${bookingStep !== "selection" ? "is-booking-step" : ""}`}>
              <p className="movies-eyebrow">
                {getReleaseLabel(
                  selectedMovie.release_status
                )}
              </p>

              <h2>
                {selectedMovie.title}
              </h2>

              <p className="movie-modal-description">
                {selectedMovie.genre ||
                  "Genre TBA"}{" "}
                ·{" "}
                {selectedMovie.language ||
                  "Language TBA"}{" "}
                ·{" "}
                {formatDuration(
                  selectedMovie.duration_minutes
                )}
              </p>

              {selectedMovie.description && (
                <p className="movie-modal-story">
                  {selectedMovie.description}
                </p>
              )}

              {/* SHOW HEADING */}

              <div className="movie-show-heading">
                <div>
                  <CalendarDays
                    size={15}
                  />

                  <span>
                    SELECT A SHOW
                  </span>
                </div>

                <span>
                  {selectedMovieShows.length >
                  0
                    ? `${selectedMovieShows.length} AVAILABLE`
                    : "NO SHOWS"}
                </span>
              </div>

              {/* SHOWS */}

              {groupedSelectedShows.length ===
              0 ? (
                <div className="movie-no-shows">
                  <Clock3 size={17} />

                  <p>
                    No upcoming screenings
                    are currently scheduled
                    for this movie.
                  </p>
                </div>
              ) : (
                <div className="movie-show-groups">
                  {groupedSelectedShows.map(
                    ({
                      date,
                      shows:
                        dateShows,
                    }) => (
                      <div
                        className="movie-show-group"
                        key={date}
                      >
                        {/* DATE */}

                        <div className="movie-show-date">
                          <div className="movie-show-date-icon">
                            <CalendarDays
                              size={14}
                            />
                          </div>

                          <div>
                            <strong>
                              {getDateLabel(
                                date
                              )}
                            </strong>

                            <span>
                              {formatShowDate(
                                date
                              )}
                            </span>
                          </div>
                        </div>

                        {/* COMPACT SHOW CARDS */}

                        <div className="movie-show-times">
                          {dateShows.map(
                            (show) => {
                              const isSelected =
                                selectedShowId ===
                                show.id;

                              const availability =
                                showAvailability[show.id];

                              const remainingSeats =
                                availability?.remaining_capacity ??
                                null;

                              const isSoldOut =
                                availability
                                  ? availability.sold_out ||
                                    availability.remaining_capacity === 0
                                  : show.status === "sold_out";

                              const isAnimating =
                                selectionAnimatingId ===
                                show.id;

                              const showButtonClass =
                                [
                                  isSelected
                                    ? "selected"
                                    : "",
                                  isSoldOut
                                    ? "sold-out"
                                    : "",
                                  isAnimating
                                    ? "selecting"
                                    : "",
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(
                                    " "
                                  );

                              return (
                                <button
                                  key={
                                    show.id
                                  }
                                  type="button"
                                  disabled={
                                    isSoldOut
                                  }
                                  className={
                                    showButtonClass
                                  }
                                  onClick={() =>
                                    handleShowSelect(
                                      show
                                    )
                                  }
                                  aria-label={
                                    isSoldOut
                                      ? `${formatShowTime(
                                          show.show_time
                                        )}, sold out`
                                      : `Select ${formatShowTime(
                                          show.show_time
                                        )} at ${formatPrice(
                                          show.base_price
                                        )}`
                                  }
                                >
                                  {/* ANIMATED TICKET */}

                                  <span className="show-ticket-animation">
                                    <Ticket
                                      size={
                                        15
                                      }
                                    />
                                  </span>

                                  {/* TIME */}

                                  <span className="show-time">
                                    {formatShowTime(
                                      show.show_time
                                    )}
                                  </span>

                                  {/* PRICE */}

                                  <span className="show-price">
                                    {isSoldOut
                                      ? "SOLD OUT"
                                      : formatPrice(
                                          show.base_price
                                        )}
                                  </span>

                                  {/* SCREEN */}

                                  {!isSoldOut &&
                                    show.screen && (
                                      <span className="show-screen">
                                        {
                                          show
                                            .screen
                                            .name
                                        }
                                      </span>
                                    )}

                                  {/* SOLD OUT */}

                                  {isSoldOut && (
                                    <span className="show-screen sold-label">
                                      SOLD OUT
                                    </span>
                                  )}

                                  {!isSoldOut &&
                                    remainingSeats !== null && (
                                      <span
                                        className={
                                          remainingSeats <= 5
                                            ? "show-availability is-low"
                                            : "show-availability"
                                        }
                                      >
                                        {remainingSeats <= 5
                                          ? `ONLY ${remainingSeats} SEATS LEFT`
                                          : `${remainingSeats} SEATS AVAILABLE`}
                                      </span>
                                    )}

                                  {/* SHIMMER */}

                                  <span className="show-selection-shine" />
                                </button>
                              );
                            }
                          )}
                        </div>

                        {selectedShowId &&
                          dateShows.some(
                            (show) =>
                              show.id === selectedShowId
                          ) &&
                          selectedShow?.screen && (
                            <div className="movie-selected-location">
                              <div className="movie-selected-location-name">
                                <MapPin size={13} />
                                <span>
                                  {selectedShow.screen.name}
                                </span>
                              </div>

                              {selectedShow.screen.google_maps_url && (
                                <a
                                  href={selectedShow.screen.google_maps_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="show-location-link"
                                  onClick={(event) =>
                                    event.stopPropagation()
                                  }
                                >
                                  <MapPin size={12} />
                                  VIEW LOCATION
                                  <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                          )}
                      </div>
                    )
                  )}
                </div>
              )}

              {selectedShow &&
                selectedAvailability && (
                  <div
                    className={[
                      "movie-selected-availability",
                      selectedShowIsSoldOut
                        ? "is-sold-out"
                        : selectedRemainingSeats <= 5
                          ? "is-low"
                          : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span>
                      {selectedShowIsSoldOut
                        ? "SOLD OUT"
                        : selectedRemainingSeats <= 5
                          ? `ONLY ${selectedRemainingSeats} SEATS LEFT`
                          : `${selectedRemainingSeats} SEATS AVAILABLE`}
                    </span>
                    <small>
                      {selectedAvailability.occupied_people} / {selectedAvailability.capacity} OCCUPIED
                    </small>
                  </div>
                )}

              {/* PEOPLE + LIVE PRICING */}

              {selectedShow &&
                !selectedShowIsSoldOut &&
                selectedAvailability && (
                  <div className="movie-booking-summary">
                    <div className="movie-booking-summary-head">
                      <div>
                        <p>
                          BOOK YOUR GROUP
                        </p>
                        <span>
                          Choose how many people are
                          attending.
                        </span>
                      </div>

                      <div className="movie-total-price">
                        <span>TOTAL</span>
                        <strong>
                          {formatPrice(
                            selectedTotal
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="movie-group-picker-row">
                      <div className="movie-group-picker-label">
                        <span>PEOPLE</span>
                        <small>
                          {formatPrice(
                            selectedPerPersonEffective
                          )}{" "}
                          effective / person
                        </small>
                      </div>

                      <div
                        className="movie-group-picker"
                        aria-label="Number of people"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setGroupSize(
                              (current) =>
                                Math.max(
                                  1,
                                  current - 1
                                )
                            )
                          }
                          disabled={
                            groupSize <= 1
                          }
                          aria-label="Remove one person"
                        >
                          −
                        </button>

                        <strong>
                          {groupSize}
                        </strong>

                        <button
                          type="button"
                          onClick={() =>
                            setGroupSize(
                              (current) =>
                                Math.min(
                                  current + 1,
                                  selectedRemainingSeats
                                )
                            )
                          }
                          disabled={
                            !selectedAvailability ||
                            groupSize >= selectedRemainingSeats
                          }
                          aria-label="Add one person"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="movie-pricing-note">
                      {applicableGroupPackage &&
                      applicableGroupPackage.group_size >
                        1 ? (
                        <>
                          <span>
                            {applicableGroupPackage.group_size}{" "}
                            PERSON PACKAGE ·{" "}
                            {formatPrice(
                              applicableGroupPackage.price_per_person
                            )}{" "}
                            / PERSON
                          </span>

                          {packageExtraPeople >
                            0 && (
                            <span>
                              +{" "}
                              {packageExtraPeople}{" "}
                              extra{" "}
                              {packageExtraPeople ===
                              1
                                ? "person"
                                : "people"}{" "}
                              at{" "}
                              {formatPrice(
                                singlePersonPrice
                              )}{" "}
                              / PERSON
                            </span>
                          )}
                        </>
                      ) : (
                        <span>
                          SINGLE-PERSON RATE ·{" "}
                          {formatPrice(
                            singlePersonPrice
                          )}{" "}
                          / PERSON
                        </span>
                      )}
                    </div>
                  </div>
                )}

              {/* BOOKING CTA */}

              {bookingStep === "selection" && (
                <button
                  className={[
                    "movie-book-button",
                    selectedShow
                      ? "has-selection"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="button"
                  onClick={continueToBooking}
                  disabled={
                    !selectedShow ||
                    !selectedAvailability ||
                    selectedShowIsSoldOut ||
                    groupSize > selectedRemainingSeats ||
                    selectedMovie.release_status !== "now_showing" ||
                    isRefreshingAvailability
                  }
                >
                  <Ticket size={16} />

                  {selectedMovie.release_status !== "now_showing"
                    ? "COMING SOON"
                    : isRefreshingAvailability
                      ? "CHECKING AVAILABILITY..."
                      : selectedShow
                        ? "CONTINUE TO BOOKING"
                        : "SELECT A SHOW"}
                </button>
              )}

              {bookingStep === "details" && (
                <div className="movie-customer-step">
                  <div className="movie-customer-step-heading">
                    <div>
                      <span>STEP 2 · CUSTOMER DETAILS</span>
                      <strong>Who should receive the booking?</strong>
                    </div>
                    <span className="movie-customer-step-total">
                      {formatPrice(selectedTotal)}
                    </span>
                  </div>

                  <div className="movie-customer-form">
                    <label>
                      <span>FULL NAME</span>
                      <input
                        value={customerName}
                        onChange={(event) => setCustomerName(event.target.value)}
                        placeholder="Your name"
                        autoComplete="name"
                      />
                    </label>

                    <label>
                      <span>EMAIL</span>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(event) => setCustomerEmail(event.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </label>

                    <label>
                      <span>PHONE</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={customerPhone}
                        onChange={(event) =>
                          setCustomerPhone(
                            event.target.value.replace(/\D/g, "").slice(0, 10)
                          )
                        }
                        placeholder="10-digit mobile number"
                        autoComplete="tel"
                        maxLength={10}
                        pattern="[0-9]{10}"
                        required
                      />
                    </label>
                  </div>

                  {bookingError && (
                    <p className="movie-booking-error">{bookingError}</p>
                  )}

                  <div className="movie-customer-actions">
                    <button
                      type="button"
                      className="movie-customer-back"
                      onClick={() => {
                        setBookingError("");
                        setBookingStep("selection");
                      }}
                      disabled={isCreatingBooking}
                    >
                      BACK
                    </button>

                    <button
                      type="button"
                      className="movie-book-button has-selection"
                      onClick={createBooking}
                      disabled={isCreatingBooking}
                    >
                      <Ticket size={16} />
                      {isCreatingBooking ? "CHECKING AVAILABILITY..." : "RESERVE & CONTINUE"}
                    </button>
                  </div>
                </div>
              )}

              {bookingStep === "payment" && bookingResult && (
                <div className="movie-payment-step">
                  <div className="movie-customer-step-heading">
                    <div>
                      <span>STEP 3 · PAYMENT</span>
                      <strong>Complete your UPI payment</strong>
                    </div>
                    <span className="movie-customer-step-total">
                      {formatPrice(Number(bookingResult.total_amount))}
                    </span>
                  </div>

                  <div className="movie-payment-summary">
                    <div>
                      <span>BOOKING</span>
                      <strong>{bookingResult.booking_reference}</strong>
                    </div>
                    <div>
                      <span>AMOUNT</span>
                      <strong>{formatPrice(Number(bookingResult.total_amount))}</strong>
                    </div>
                  </div>

                  {CINETARA_UPI_ID ? (
                    <>
                      <div className="movie-upi-card">
                        <span className="movie-upi-label">PAY TO CINETARA</span>
                        <strong>{CINETARA_UPI_ID}</strong>
                        <small>{CINETARA_UPI_NAME}</small>
                        <div className="movie-upi-actions">
                          <button
                            type="button"
                            className="movie-book-button has-selection movie-upi-pay-button"
                            onClick={openUpiPayment}
                          >
                            PAY VIA UPI APP
                            <ExternalLink size={15} />
                          </button>
                          <button
                            type="button"
                            className="movie-customer-back movie-copy-upi"
                            onClick={copyUpiId}
                          >
                            COPY UPI ID
                          </button>
                        </div>
                      </div>

                      <p className="movie-payment-instruction">
                        Pay the exact amount above. After payment, provide either the UTR / transaction reference or the payment screenshot. At least one payment proof item is required. Your booking remains a hold until CINETARA verifies the payment.
                      </p>

                      <div className="movie-payment-proof-form">
                        <label>
                          <span>UTR / TRANSACTION REFERENCE</span>
                          <input
                            value={paymentUtr}
                            onChange={(event) =>
                              setPaymentUtr(
                                event.target.value.replace(/\D/g, "").slice(0, 12)
                              )
                            }
                            placeholder="12-digit UPI transaction reference"
                            maxLength={12}
                            inputMode="numeric"
                            autoComplete="off"
                          />
                        </label>

                        <label>
                          <span>PAYMENT SCREENSHOT</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(event) => {
                              setPaymentScreenshot(event.target.files?.[0] || null);
                              setBookingError("");
                            }}
                          />
                          <small>JPG, PNG or WEBP · MAX 5 MB</small>
                        </label>
                      </div>

                      <p className="movie-payment-proof-note">Provide either the UTR / transaction reference or the payment screenshot. You do not need to provide both.</p>

                      {bookingError && (
                        <p className="movie-booking-error">{bookingError}</p>
                      )}

                      <button
                        type="button"
                        className="movie-book-button has-selection movie-payment-submit"
                        onClick={submitPaymentProof}
                        disabled={isSubmittingPayment}
                      >
                        <Ticket size={16} />
                        {isSubmittingPayment ? "SUBMITTING PAYMENT PROOF..." : "SUBMIT PAYMENT PROOF"}
                      </button>
                    </>
                  ) : (
                    <div className="movie-payment-unconfigured">
                      <strong>UPI PAYMENT NOT CONFIGURED</strong>
                      <p>
                        Add your CINETARA UPI ID to the Vite environment configuration before accepting payments.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {bookingStep === "created" && bookingResult && (
                <div className="movie-booking-created">
                  <p className="movies-eyebrow">PAYMENT SUBMITTED · VERIFICATION PENDING</p>
                  <h3>{bookingResult.booking_reference}</h3>
                  <p>
                    Your {bookingResult.people_count}-person booking is reserved while CINETARA verifies the payment.
                  </p>
                  <div className="movie-created-summary">
                    <span>SHOW</span>
                    <strong>{formatShowDate(bookingResult.show_date)} · {formatShowTime(bookingResult.show_time)}</strong>
                    <span>VENUE</span>
                    <strong>{bookingResult.screen_name}</strong>
                    <span>TOTAL</span>
                    <strong>{formatPrice(Number(bookingResult.total_amount))}</strong>
                    <span>PAYMENT</span>
                    <strong>VERIFICATION PENDING</strong>
                  </div>
                  <p className="movie-payment-note">
                    Screenshot this confirmation and retain it until your CINETARA ticket arrives. Your ticket will be issued only after the payment is verified.
                  </p>
                </div>
              )}

              {bookingStep === "created" && bookingError && (
                <p className="movie-booking-error">{bookingError}</p>
              )}

              {bookingStep === "selection" && (
                <p className="movie-coming-note">
                  {selectedMovie.release_status !== "now_showing"
                    ? "COMING SOON · BOOKINGS OPEN WHEN THIS MOVIE IS NOW SHOWING."
                    : selectedShowIsSoldOut
                      ? "SOLD OUT · THIS SCREENING IS NO LONGER AVAILABLE."
                      : selectedShow &&
                          selectedAvailability &&
                          groupSize > selectedRemainingSeats
                        ? `ONLY ${selectedRemainingSeats} ${selectedRemainingSeats === 1 ? "SEAT IS" : "SEATS ARE"} CURRENTLY AVAILABLE · REDUCE PEOPLE TO CONTINUE.`
                        : selectedShow
                          ? `${formatShowDate(selectedShow.show_date)} · ${formatShowTime(selectedShow.show_time)} · ${selectedShow.screen?.name || "CINETARA"} · ${formatPrice(selectedTotal)} TOTAL`
                          : "Select a live screening to continue to booking."}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Movies;