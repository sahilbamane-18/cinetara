import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  ExternalLink,
  Film,
  MapPin,
  MonitorPlay,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import "./AdminScreenings.css";

type MovieStatus =
  | "now_showing"
  | "coming_soon"
  | "archived";

type Movie = {
  id: string;
  title: string;
  release_status: MovieStatus;
  poster_url: string | null;
};

type Screen = {
  id: string;
  name: string;
  capacity: number;
  is_active: boolean;
  google_maps_url: string | null;
  created_at: string;
};

type ShowStatus =
  | "active"
  | "sold_out"
  | "cancelled"
  | "completed"
  | "archived";

type Show = {
  id: string;
  movie_id: string;
  screen_id: string;
  show_date: string;
  show_time: string;
  base_price: number;
  status: ShowStatus;
  created_at: string;
  updated_at: string;
  movie: Movie | null;
  screen: Screen | null;
};

type ShowGroupPrice = {
  id?: string;
  show_id?: string;
  group_size: number;
  price_per_person: number;
};

type PricingTierForm = {
  group_size: string;
  price_per_person: string;
};

type ScreenForm = {
  name: string;
  capacity: string;
  google_maps_url: string;
  is_active: boolean;
};

type ShowForm = {
  movie_id: string;
  screen_id: string;
  show_date: string;
  show_time: string;
  base_price: string;
  status: ShowStatus;
};

type ActiveModal =
  | "screen"
  | "show"
  | "delete-screen"
  | "delete-show"
  | null;

const emptyScreenForm: ScreenForm = {
  name: "",
  capacity: "",
  google_maps_url: "",
  is_active: true,
};

const emptyShowForm: ShowForm = {
  movie_id: "",
  screen_id: "",
  show_date: "",
  show_time: "",
  base_price: "",
  status: "active",
};

const showStatusOptions: {
  value: ShowStatus;
  label: string;
}[] = [
  {
    value: "active",
    label: "Active",
  },
  {
    value: "sold_out",
    label: "Sold Out",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "archived",
    label: "Archived",
  },
];

function formatDate(dateString: string) {
  if (!dateString) {
    return "";
  }

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(dateString: string) {
  if (!dateString) {
    return "";
  }

  const date = new Date(`${dateString}T00:00:00`);

  return {
    day: date.toLocaleDateString("en-IN", {
      day: "2-digit",
    }),
    month: date
      .toLocaleDateString("en-IN", {
        month: "short",
      })
      .toUpperCase(),
    weekday: date
      .toLocaleDateString("en-IN", {
        weekday: "short",
      })
      .toUpperCase(),
  };
}

function formatTime(timeString: string) {
  if (!timeString) {
    return "";
  }

  const [hours, minutes] = timeString.split(":").map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return timeString;
  }

  const date = new Date();

  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

function isValidHttpUrl(value: string) {
  if (!value.trim()) {
    return true;
  }

  try {
    const url = new URL(value.trim());

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function getTodayString() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(
    today.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    today.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function AdminScreenings() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [showGroupPrices, setShowGroupPrices] =
    useState<Record<string, ShowGroupPrice[]>>({});

  const [activeTab, setActiveTab] = useState<
    "screens" | "shows"
  >("screens");

  const [screenSearch, setScreenSearch] =
    useState("");

  const [showSearch, setShowSearch] =
    useState("");

  const [showStatusFilter, setShowStatusFilter] =
    useState<"all" | ShowStatus>("all");

  const [showDateFilter, setShowDateFilter] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [loadError, setLoadError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [deleteModalError, setDeleteModalError] =
    useState("");

  const [activeModal, setActiveModal] =
    useState<ActiveModal>(null);

  const [editingScreen, setEditingScreen] =
    useState<Screen | null>(null);

  const [editingShow, setEditingShow] =
    useState<Show | null>(null);

  const [deletingScreen, setDeletingScreen] =
    useState<Screen | null>(null);

  const [deletingShow, setDeletingShow] =
    useState<Show | null>(null);

  const [screenForm, setScreenForm] =
    useState<ScreenForm>(emptyScreenForm);

  const [showForm, setShowForm] =
    useState<ShowForm>(emptyShowForm);

  const [pricingTiers, setPricingTiers] =
    useState<PricingTierForm[]>([
      {
        group_size: "1",
        price_per_person: "",
      },
    ]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    const [
      moviesResult,
      screensResult,
      showsResult,
      pricesResult,
    ] = await Promise.all([
      supabase
        .from("movies")
        .select(
          "id, title, release_status, poster_url",
        )
        .order("title", {
          ascending: true,
        }),

      supabase
        .from("screens")
        .select(
          `
            id,
            name,
            capacity,
            is_active,
            google_maps_url,
            created_at
          `,
        )
        .order("name", {
          ascending: true,
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
            created_at,
            updated_at,
            movie:movies(
              id,
              title,
              release_status,
              poster_url
            ),
            screen:screens(
              id,
              name,
              capacity,
              is_active,
              google_maps_url,
              created_at
            )
          `,
        )
        .order("show_date", {
          ascending: true,
        })
        .order("show_time", {
          ascending: true,
        }),

      supabase
        .from("show_group_prices")
        .select(
          "id, show_id, group_size, price_per_person",
        )
        .order("group_size", {
          ascending: true,
        }),
    ]);

    if (moviesResult.error) {
      setLoadError(
        moviesResult.error.message,
      );
      setIsLoading(false);
      return;
    }

    if (screensResult.error) {
      setLoadError(
        screensResult.error.message,
      );
      setIsLoading(false);
      return;
    }

    if (showsResult.error) {
      setLoadError(
        showsResult.error.message,
      );
      setIsLoading(false);
      return;
    }

    if (pricesResult.error) {
      setLoadError(
        pricesResult.error.message,
      );
      setIsLoading(false);
      return;
    }

    const normalizedShows: Show[] = (
      (showsResult.data ?? []) as unknown as Show[]
    ).map((show) => {
      let movie: Movie | null = null;
      let screen: Screen | null = null;

      if (Array.isArray(show.movie)) {
        movie = show.movie[0] ?? null;
      } else if (show.movie) {
        movie = show.movie;
      }

      if (Array.isArray(show.screen)) {
        screen = show.screen[0] ?? null;
      } else if (show.screen) {
        screen = show.screen;
      }

      return {
        ...show,
        movie,
        screen,
        base_price: Number(
          show.base_price,
        ),
      };
    });

    setMovies(
      (moviesResult.data ?? []) as Movie[],
    );

    setScreens(
      (screensResult.data ?? []) as Screen[],
    );

    setShows(normalizedShows);

    const groupedPrices: Record<
      string,
      ShowGroupPrice[]
    > = {};

    ((pricesResult.data ?? []) as ShowGroupPrice[]).forEach(
      (price) => {
        if (!groupedPrices[price.show_id ?? ""]) {
          groupedPrices[price.show_id ?? ""] = [];
        }

        groupedPrices[price.show_id ?? ""].push({
          id: price.id,
          show_id: price.show_id,
          group_size: Number(price.group_size),
          price_per_person: Number(
            price.price_per_person,
          ),
        });
      },
    );

    setShowGroupPrices(groupedPrices);

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage("");
    }, 3500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [successMessage]);

  const activeMovies = useMemo(
    () =>
      movies.filter(
        (movie) =>
          movie.release_status ===
            "now_showing" ||
          movie.release_status ===
            "coming_soon",
      ),
    [movies],
  );

  const activeScreens = useMemo(
    () =>
      screens.filter(
        (screen) => screen.is_active,
      ),
    [screens],
  );

  const upcomingShows = useMemo(() => {
    const today = getTodayString();

    return shows.filter(
      (show) =>
        show.show_date >= today &&
        show.status !== "completed" &&
        show.status !== "cancelled",
    );
  }, [shows]);

  const todaysShows = useMemo(() => {
    const today = getTodayString();

    return shows.filter(
      (show) =>
        show.show_date === today &&
        show.status !== "cancelled",
    );
  }, [shows]);

  const filteredScreens = useMemo(() => {
    const query =
      screenSearch.trim().toLowerCase();

    if (!query) {
      return screens;
    }

    return screens.filter((screen) =>
      screen.name
        .toLowerCase()
        .includes(query),
    );
  }, [screens, screenSearch]);

  const filteredShows = useMemo(() => {
    const query =
      showSearch.trim().toLowerCase();

    return shows.filter((show) => {
      const matchesSearch =
        !query ||
        show.movie?.title
          .toLowerCase()
          .includes(query) ||
        show.screen?.name
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        showStatusFilter === "all" ||
        show.status === showStatusFilter;

      const matchesDate =
        !showDateFilter ||
        show.show_date === showDateFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDate
      );
    });
  }, [
    shows,
    showSearch,
    showStatusFilter,
    showDateFilter,
  ]);

  const screenShowCounts = useMemo(() => {
    const counts = new Map<
      string,
      number
    >();

    shows.forEach((show) => {
      counts.set(
        show.screen_id,
        (counts.get(show.screen_id) ?? 0) +
          1,
      );
    });

    return counts;
  }, [shows]);

  function showSuccess(message: string) {
    setSuccessMessage(message);
  }

  function openCreateScreen() {
    setEditingScreen(null);
    setScreenForm({
      ...emptyScreenForm,
    });
    setActiveModal("screen");
  }

  function openEditScreen(screen: Screen) {
    setEditingScreen(screen);

    setScreenForm({
      name: screen.name,
      capacity: String(
        screen.capacity,
      ),
      google_maps_url:
        screen.google_maps_url ?? "",
      is_active: screen.is_active,
    });

    setActiveModal("screen");
  }

  function closeScreenModal() {
    if (isSaving) {
      return;
    }

    setActiveModal(null);
    setEditingScreen(null);
    setScreenForm({
      ...emptyScreenForm,
    });
  }

  async function handleSaveScreen(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    const name =
      screenForm.name.trim();

    const capacity = Number(
      screenForm.capacity,
    );

    const googleMapsUrl =
      screenForm.google_maps_url.trim();

    if (!name) {
      setLoadError(
        "Enter a venue name.",
      );
      return;
    }

    if (
      !Number.isInteger(capacity) ||
      capacity <= 0
    ) {
      setLoadError(
        "Enter a valid audience capacity.",
      );
      return;
    }

    if (!isValidHttpUrl(googleMapsUrl)) {
      setLoadError(
        "Google Maps link must start with http:// or https://.",
      );
      return;
    }

    setIsSaving(true);
    setLoadError("");

    const payload = {
      name,
      capacity,
      google_maps_url:
        googleMapsUrl || null,
      is_active:
        screenForm.is_active,
    };

    const result = editingScreen
      ? await supabase
          .from("screens")
          .update(payload)
          .eq("id", editingScreen.id)
      : await supabase
          .from("screens")
          .insert(payload);

    setIsSaving(false);

    if (result.error) {
      setLoadError(
        result.error.message,
      );
      return;
    }

    closeScreenModal();

    await loadData();

    showSuccess(
      editingScreen
        ? "Venue updated successfully."
        : "Venue created successfully.",
    );
  }

  async function handleToggleScreen(
    screen: Screen,
  ) {
    setLoadError("");

    const { error } = await supabase
      .from("screens")
      .update({
        is_active: !screen.is_active,
      })
      .eq("id", screen.id);

    if (error) {
      setLoadError(error.message);
      return;
    }

    await loadData();

    showSuccess(
      screen.is_active
        ? "Venue deactivated."
        : "Venue activated.",
    );
  }

  function openDeleteScreen(
    screen: Screen,
  ) {
    setDeleteModalError("");
    setDeletingScreen(screen);
    setActiveModal("delete-screen");
  }

  function closeDeleteScreen() {
    if (isSaving) {
      return;
    }

    setDeletingScreen(null);
    setDeleteModalError("");
    setActiveModal(null);
  }

  async function handleDeleteScreen() {
    if (!deletingScreen || isSaving) {
      return;
    }

    const linkedShows =
      screenShowCounts.get(deletingScreen.id) ?? 0;

    if (linkedShows > 0) {
      setDeleteModalError(
        "This venue has linked shows. Deactivate it instead of deleting it so the screening history remains safe.",
      );
      return;
    }

    setIsSaving(true);
    setDeleteModalError("");
    setLoadError("");

    try {
      const { data: linkedShowsCheck, error: showsError } =
        await supabase
          .from("shows")
          .select("id")
          .eq("screen_id", deletingScreen.id)
          .limit(1);

      if (showsError) {
        throw showsError;
      }

      if (linkedShowsCheck && linkedShowsCheck.length > 0) {
        setDeleteModalError(
          "This venue has linked shows. Deactivate it instead of deleting it so the screening history remains safe.",
        );
        return;
      }

      const { error } = await supabase
        .from("screens")
        .delete()
        .eq("id", deletingScreen.id);

      if (error) {
        throw error;
      }

      const deletedName = deletingScreen.name;

      closeDeleteScreen();
      await loadData();

      showSuccess(
        `Venue "${deletedName}" deleted.`,
      );
    } catch (deleteError) {
      setDeleteModalError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete venue.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function openCreateShow() {
    setEditingShow(null);

    setShowForm({
      ...emptyShowForm,
      show_date: getTodayString(),
    });

    setPricingTiers([
      {
        group_size: "1",
        price_per_person: "",
      },
    ]);

    setActiveModal("show");
  }

  function openEditShow(show: Show) {
    setEditingShow(show);

    setShowForm({
      movie_id: show.movie_id,
      screen_id: show.screen_id,
      show_date: show.show_date,
      show_time:
        show.show_time.slice(0, 5),
      base_price: String(
        show.base_price,
      ),
      status: show.status,
    });

    const existingPrices =
      showGroupPrices[show.id] ?? [];

    setPricingTiers(
      existingPrices.length > 0
        ? existingPrices.map((price) => ({
            group_size: String(
              price.group_size,
            ),
            price_per_person: String(
              price.price_per_person,
            ),
          }))
        : [
            {
              group_size: "1",
              price_per_person: String(
                show.base_price,
              ),
            },
          ],
    );

    setActiveModal("show");
  }

  function closeShowModal() {
    if (isSaving) {
      return;
    }

    setActiveModal(null);
    setEditingShow(null);
    setShowForm({
      ...emptyShowForm,
    });
    setPricingTiers([
      {
        group_size: "1",
        price_per_person: "",
      },
    ]);
  }

  async function handleSaveShow(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    if (!showForm.movie_id) {
      setLoadError(
        "Select a movie.",
      );
      return;
    }

    if (!showForm.screen_id) {
      setLoadError(
        "Select a venue.",
      );
      return;
    }

    if (!showForm.show_date) {
      setLoadError(
        "Select a show date.",
      );
      return;
    }

    if (!showForm.show_time) {
      setLoadError(
        "Select a show time.",
      );
      return;
    }

    if (pricingTiers.length === 0) {
      setLoadError(
        "Add at least one ticket pricing package.",
      );
      return;
    }

    const normalizedPricing = pricingTiers.map(
      (tier) => ({
        group_size: Number(tier.group_size),
        price_per_person: Number(
          tier.price_per_person,
        ),
      }),
    );

    if (
      normalizedPricing.some(
        (tier) =>
          !Number.isInteger(tier.group_size) ||
          tier.group_size <= 0 ||
          !Number.isFinite(
            tier.price_per_person,
          ) ||
          tier.price_per_person < 0,
      )
    ) {
      setLoadError(
        "Every pricing package needs a valid group size and price per person.",
      );
      return;
    }

    const sortedPricing = [...normalizedPricing].sort(
      (a, b) => a.group_size - b.group_size,
    );

    const hasDuplicateGroupSize =
      sortedPricing.some(
        (tier, index) =>
          index > 0 &&
          tier.group_size ===
            sortedPricing[index - 1].group_size,
      );

    if (hasDuplicateGroupSize) {
      setLoadError(
        "Each group size can have only one price package.",
      );
      return;
    }

    if (sortedPricing[0].group_size !== 1) {
      setLoadError(
        "The first pricing package must be for 1 person.",
      );
      return;
    }

    const price =
      sortedPricing.find(
        (tier) => tier.group_size === 1,
      )?.price_per_person ?? 0;

    const selectedScreen =
      screens.find(
        (screen) =>
          screen.id ===
          showForm.screen_id,
      );

    if (
      !selectedScreen
    ) {
      setLoadError(
        "Selected venue could not be found.",
      );
      return;
    }

    if (
      !selectedScreen.is_active &&
      !editingShow
    ) {
      setLoadError(
        "Inactive venues cannot receive new shows.",
      );
      return;
    }

    const selectedMovie =
      movies.find(
        (movie) =>
          movie.id ===
          showForm.movie_id,
      );

    if (
      !selectedMovie
    ) {
      setLoadError(
        "Selected movie could not be found.",
      );
      return;
    }

    if (
      selectedMovie.release_status ===
      "archived"
    ) {
      setLoadError(
        "Archived movies cannot receive new shows.",
      );
      return;
    }

    setIsSaving(true);
    setLoadError("");

    const payload = {
      movie_id:
        showForm.movie_id,
      screen_id:
        showForm.screen_id,
      show_date:
        showForm.show_date,
      show_time:
        showForm.show_time,
      base_price: price,
      status:
        showForm.status,
    };

    const result = editingShow
      ? await supabase
          .from("shows")
          .update(payload)
          .eq("id", editingShow.id)
          .select("id")
          .single()
      : await supabase
          .from("shows")
          .insert(payload)
          .select("id")
          .single();

    if (result.error) {
      setIsSaving(false);

      if (
        result.error.code ===
        "23505"
      ) {
        setLoadError(
          "A show for this movie, venue, date and time already exists.",
        );
      } else {
        setLoadError(
          result.error.message,
        );
      }

      return;
    }

    const savedShowId = result.data.id;

    const { error: deletePricesError } =
      await supabase
        .from("show_group_prices")
        .delete()
        .eq("show_id", savedShowId);

    if (deletePricesError) {
      setIsSaving(false);
      setLoadError(
        `Show saved, but pricing could not be updated: ${deletePricesError.message}`,
      );
      return;
    }

    const { error: insertPricesError } =
      await supabase
        .from("show_group_prices")
        .insert(
          sortedPricing.map((tier) => ({
            show_id: savedShowId,
            group_size: tier.group_size,
            price_per_person:
              tier.price_per_person,
          })),
        );

    setIsSaving(false);

    if (insertPricesError) {
      setLoadError(
        `Show saved, but pricing could not be updated: ${insertPricesError.message}`,
      );
      await loadData();
      return;
    }

    closeShowModal();

    await loadData();

    showSuccess(
      editingShow
        ? "Show and ticket pricing updated successfully."
        : "Show and ticket pricing created successfully.",
    );
  }

  function openDeleteShow(
    show: Show,
  ) {
    setDeleteModalError("");
    setDeletingShow(show);
    setActiveModal("delete-show");
  }

  function closeDeleteShow() {
    if (isSaving) {
      return;
    }

    setDeletingShow(null);
    setDeleteModalError("");
    setActiveModal(null);
  }

  async function handleDeleteShow() {
    if (!deletingShow || isSaving) {
      return;
    }

    setIsSaving(true);
    setDeleteModalError("");
    setLoadError("");

    try {
      /*
       * Booking history must be preserved. A rejected/cancelled
       * booking does not need to block show cleanup, but a booking
       * that is still financially or operationally meaningful does.
       */
      const { data: relatedBookings, error: bookingsError } =
        await supabase
          .from("movie_bookings")
          .select("id, booking_status, payment_status")
          .eq("show_id", deletingShow.id);

      if (bookingsError) {
        throw bookingsError;
      }

      const protectedBookings = (relatedBookings ?? []).filter(
        (booking) =>
          booking.booking_status === "confirmed" ||
          (
            booking.booking_status === "pending" &&
            booking.payment_status === "verification_pending"
          ),
      );

      if (protectedBookings.length > 0) {
        setDeleteModalError(
          "This show has confirmed or payment-verification bookings. It cannot be removed while those reservations exist.",
        );
        return;
      }

      const historicalBookings = (relatedBookings ?? []).filter(
        (booking) =>
          booking.booking_status === "rejected" ||
          booking.booking_status === "cancelled" ||
          (
            booking.booking_status === "pending" &&
            booking.payment_status !== "verification_pending"
          ),
      );

      if (historicalBookings.length > 0) {
        /*
         * Keep the show row because movie_bookings.show_id points to it.
         * Archived shows disappear from the public schedule while their
         * booking history remains available to the admin.
         */
        const { error: archiveError } = await supabase
          .from("shows")
          .update({
            status: "archived",
            updated_at: new Date().toISOString(),
          })
          .eq("id", deletingShow.id);

        if (archiveError) {
          throw archiveError;
        }

        const archivedMovie =
          deletingShow.movie?.title || "Show";

        closeDeleteShow();
        await loadData();

        showSuccess(
          `${archivedMovie} show archived. Booking history was preserved.`,
        );
        return;
      }

      /*
       * No meaningful booking history exists. Pricing rows depend on the
       * show, so remove them first before permanently deleting the show.
       */
      const { error: pricingError } = await supabase
        .from("show_group_prices")
        .delete()
        .eq("show_id", deletingShow.id);

      if (pricingError) {
        throw pricingError;
      }

      const { error: showDeleteError } = await supabase
        .from("shows")
        .delete()
        .eq("id", deletingShow.id);

      if (showDeleteError) {
        throw showDeleteError;
      }

      const deletedMovie =
        deletingShow.movie?.title || "Show";

      closeDeleteShow();
      await loadData();

      showSuccess(
        `${deletedMovie} show deleted.`,
      );
    } catch (deleteError) {
      setDeleteModalError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete show.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const modalIsOpen =
    activeModal !== null;

  return (
    <div className="admin-screenings-page">
      <div className="admin-screenings-header">
        <div>
          <p className="admin-screenings-eyebrow">
            CINETARA · OPERATIONS
          </p>

          <h1>
            Screening Manager
          </h1>

          <p className="admin-screenings-subtitle">
            Manage venues, locations and
            public show schedules.
          </p>
        </div>

        <div className="admin-screenings-header-actions">
          <button
            type="button"
            className="admin-screenings-refresh"
            onClick={loadData}
            disabled={isLoading}
          >
            <RefreshCw
              size={14}
              className={
                isLoading
                  ? "is-spinning"
                  : ""
              }
            />
            REFRESH
          </button>

          <button
            type="button"
            className="admin-screenings-primary"
            onClick={
              activeTab === "screens"
                ? openCreateScreen
                : openCreateShow
            }
          >
            <Plus size={15} />
            {activeTab === "screens"
              ? "ADD VENUE"
              : "ADD SHOW"}
          </button>
        </div>
      </div>

      {loadError && (
        <div className="admin-screenings-alert admin-screenings-error">
          <ShieldAlert size={16} />

          <span>{loadError}</span>

          <button
            type="button"
            onClick={() =>
              setLoadError("")
            }
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="admin-screenings-alert admin-screenings-success">
          <Check size={16} />

          <span>
            {successMessage}
          </span>
        </div>
      )}

      <div className="admin-screenings-stats">
        <div className="screening-stat-card">
          <div className="screening-stat-icon">
            <MonitorPlay size={18} />
          </div>

          <div>
            <span>
              TOTAL VENUES
            </span>

            <strong>
              {screens.length}
            </strong>
          </div>
        </div>

        <div className="screening-stat-card">
          <div className="screening-stat-icon">
            <Check size={18} />
          </div>

          <div>
            <span>
              ACTIVE VENUES
            </span>

            <strong>
              {activeScreens.length}
            </strong>
          </div>
        </div>

        <div className="screening-stat-card">
          <div className="screening-stat-icon">
            <Film size={18} />
          </div>

          <div>
            <span>
              UPCOMING SHOWS
            </span>

            <strong>
              {upcomingShows.length}
            </strong>
          </div>
        </div>

        <div className="screening-stat-card">
          <div className="screening-stat-icon">
            <CalendarDays size={18} />
          </div>

          <div>
            <span>
              TODAY'S SHOWS
            </span>

            <strong>
              {todaysShows.length}
            </strong>
          </div>
        </div>
      </div>

      <div className="admin-screenings-tabs">
        <button
          type="button"
          className={
            activeTab === "screens"
              ? "is-active"
              : ""
          }
          onClick={() =>
            setActiveTab("screens")
          }
        >
          <MonitorPlay size={14} />
          VENUES
        </button>

        <button
          type="button"
          className={
            activeTab === "shows"
              ? "is-active"
              : ""
          }
          onClick={() =>
            setActiveTab("shows")
          }
        >
          <CalendarDays size={14} />
          SHOW SCHEDULE
        </button>
      </div>

      {activeTab === "screens" && (
        <section className="screening-panel">
          <div className="screening-panel-toolbar">
            <div>
              <p className="screening-panel-kicker">
                VENUE INVENTORY
              </p>

              <h2>
                Venue Management
              </h2>
            </div>

            <div className="screening-search">
              <Search size={14} />

              <input
                type="text"
                placeholder="Search venues..."
                value={screenSearch}
                onChange={(event) =>
                  setScreenSearch(
                    event.target.value,
                  )
                }
              />
            </div>
          </div>

          {isLoading ? (
            <div className="admin-screenings-loading">
              <div className="screening-stat-loader" />

              <p>
                Loading venues...
              </p>
            </div>
          ) : filteredScreens.length ===
            0 ? (
            <div className="screening-empty">
              <MonitorPlay size={22} />

              <h3>
                No venues found
              </h3>

              <p>
                Add a venue to start
                scheduling CINETARA shows.
              </p>

              <button
                type="button"
                className="admin-screenings-primary"
                onClick={
                  openCreateScreen
                }
              >
                <Plus size={14} />
                ADD VENUE
              </button>
            </div>
          ) : (
            <div className="screen-table-wrap">
              <table className="screen-table">
                <thead>
                  <tr>
                    <th>
                      VENUE
                    </th>

                    <th>
                      AUDIENCE CAPACITY
                    </th>

                    <th>
                      STATUS
                    </th>

                    <th>
                      SHOWS
                    </th>

                    <th>
                      LOCATION
                    </th>

                    <th>
                      ACTIONS
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredScreens.map(
                    (screen) => {
                      const showCount =
                        screenShowCounts.get(
                          screen.id,
                        ) ?? 0;

                      return (
                        <tr
                          key={screen.id}
                        >
                          <td>
                            <div className="screen-name-cell">
                              <div className="screen-table-icon">
                                <MapPin
                                  size={15}
                                />
                              </div>

                              <div>
                                <strong>
                                  {
                                    screen.name
                                  }
                                </strong>

                                <span>
                                  Venue
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="capacity-cell">
                              <Users
                                size={13}
                              />

                              <span>
                                {
                                  screen.capacity
                                }{" "}
                                people
                              </span>
                            </div>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="screen-active-toggle"
                              onClick={() =>
                                handleToggleScreen(
                                  screen,
                                )
                              }
                              title={
                                screen.is_active
                                  ? "Deactivate venue"
                                  : "Activate venue"
                              }
                            >
                              <span
                                className={
                                  screen.is_active
                                    ? "active"
                                    : ""
                                }
                              />

                              {screen.is_active
                                ? "ACTIVE"
                                : "INACTIVE"}
                            </button>
                          </td>

                          <td>
                            <span className="screen-show-count">
                              {
                                showCount
                              }
                            </span>
                          </td>

                          <td>
                            {screen.google_maps_url ? (
                              <a
                                href={
                                  screen.google_maps_url
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="venue-map-link"
                              >
                                <MapPin
                                  size={12}
                                />
                                VIEW MAP
                                <ExternalLink
                                  size={10}
                                />
                              </a>
                            ) : (
                              <span className="venue-map-missing">
                                NOT ADDED
                              </span>
                            )}
                          </td>

                          <td>
                            <div className="screen-row-actions">
                              <button
                                type="button"
                                className="screen-action-button"
                                onClick={() =>
                                  openEditScreen(
                                    screen,
                                  )
                                }
                                title="Edit venue"
                              >
                                <Pencil
                                  size={13}
                                />
                              </button>

                              <button
                                type="button"
                                className="screen-action-button danger"
                                onClick={() =>
                                  openDeleteScreen(
                                    screen,
                                  )
                                }
                                title="Delete venue"
                                disabled={
                                  showCount >
                                  0
                                }
                              >
                                <Trash2
                                  size={13}
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === "shows" && (
        <section className="screening-panel">
          <div className="screening-show-toolbar">
            <div>
              <p className="screening-panel-kicker">
                PUBLIC SCHEDULE
              </p>

              <h2>
                Show Schedule
              </h2>
            </div>

            <div className="show-filters">
              <div className="screening-search">
                <Search size={14} />

                <input
                  type="text"
                  placeholder="Search movie or venue..."
                  value={showSearch}
                  onChange={(event) =>
                    setShowSearch(
                      event.target.value,
                    )
                  }
                />
              </div>

              <div className="form-select-wrap">
                <select
                  className="screening-select"
                  value={
                    showStatusFilter
                  }
                  onChange={(event) =>
                    setShowStatusFilter(
                      event.target
                        .value as
                        | "all"
                        | ShowStatus,
                    )
                  }
                >
                  <option value="all">
                    All Status
                  </option>

                  {showStatusOptions.map(
                    (option) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {
                          option.label
                        }
                      </option>
                    ),
                  )}
                </select>

                <ChevronDown
                  size={13}
                />
              </div>

              <div className="screening-date-filter">
                <CalendarDays
                  size={13}
                />

                <input
                  type="date"
                  value={
                    showDateFilter
                  }
                  onChange={(event) =>
                    setShowDateFilter(
                      event.target.value,
                    )
                  }
                />

                {showDateFilter && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowDateFilter(
                        "",
                      )
                    }
                    aria-label="Clear date"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="admin-screenings-loading">
              <div className="screening-stat-loader" />

              <p>
                Loading show schedule...
              </p>
            </div>
          ) : filteredShows.length ===
            0 ? (
            <div className="screening-empty">
              <CalendarDays size={22} />

              <h3>
                No shows found
              </h3>

              <p>
                Create a show to publish a
                screening time to customers.
              </p>

              <button
                type="button"
                className="admin-screenings-primary"
                onClick={
                  openCreateShow
                }
              >
                <Plus size={14} />
                ADD SHOW
              </button>
            </div>
          ) : (
            <div className="show-schedule">
              {filteredShows.map(
                (show) => {
                  const date =
                    formatShortDate(
                      show.show_date,
                    );

                  const isPast =
                    `${show.show_date}T${show.show_time}` <
                    new Date()
                      .toISOString()
                      .slice(
                        0,
                        16,
                      );

                  return (
                    <article
                      className="show-card"
                      key={show.id}
                    >
                      <div className="show-date-block">
                        <span>
                          {date.weekday}
                        </span>

                        <strong>
                          {date.day}
                        </strong>

                        <small>
                          {date.month}
                        </small>
                      </div>

                      {show.movie
                        ?.poster_url ? (
                        <img
                          className="show-poster"
                          src={
                            show.movie
                              .poster_url
                          }
                          alt=""
                        />
                      ) : (
                        <div className="show-poster show-poster-fallback">
                          <Film
                            size={18}
                          />
                        </div>
                      )}

                      <div className="show-main">
                        <div className="show-main-top">
                          <div>
                            <p className="show-kicker">
                              {isPast
                                ? "PAST SHOW"
                                : "SCREENING"}
                            </p>

                            <h3>
                              {show.movie
                                ?.title ||
                                "Movie unavailable"}
                            </h3>
                          </div>

                          <span
                            className={`show-status ${show.status}`}
                          >
                            {show.status.replace(
                              "_",
                              " ",
                            )}
                          </span>
                        </div>

                        <div className="show-meta">
                          <span>
                            <Clock3
                              size={12}
                            />
                            {formatTime(
                              show.show_time,
                            )}
                          </span>

                          <span>
                            <MapPin
                              size={12}
                            />
                            {show.screen
                              ?.name ||
                              "Venue TBA"}
                          </span>

                          <span>
                            <Users
                              size={12}
                            />
                            {show.screen
                              ?.capacity ??
                              "—"}{" "}
                            people
                          </span>
                        </div>

                        <div className="show-price show-price-packages">
                          <span className="show-price-label">
                            FROM
                          </span>
                          {formatPrice(
                            show.base_price,
                          )}
                          <span className="show-price-suffix">
                            / PERSON
                          </span>
                          {(showGroupPrices[show.id] ?? []).length > 1 && (
                            <span className="show-price-package-count">
                              {(showGroupPrices[show.id] ?? []).length} PACKAGES
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="show-actions">
                        {show.screen
                          ?.google_maps_url && (
                          <a
                            href={
                              show.screen
                                .google_maps_url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="screen-action-button"
                            title="Open venue location"
                          >
                            <MapPin
                              size={13}
                            />
                          </a>
                        )}

                        <button
                          type="button"
                          className="screen-action-button"
                          onClick={() =>
                            openEditShow(
                              show,
                            )
                          }
                          title="Edit show"
                        >
                          <Pencil
                            size={13}
                          />
                        </button>

                        <button
                          type="button"
                          className="screen-action-button danger"
                          onClick={() =>
                            openDeleteShow(
                              show,
                            )
                          }
                          title="Delete show"
                        >
                          <Trash2
                            size={13}
                          />
                        </button>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>
      )}

      {activeModal === "screen" && (
        <div
          className="screening-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeScreenModal();
            }
          }}
        >
          <form
            className="screening-modal"
            onSubmit={
              handleSaveScreen
            }
          >
            <div className="screening-modal-header">
              <div>
                <p>
                  VENUE MANAGEMENT
                </p>

                <h2>
                  {editingScreen
                    ? "Edit Venue"
                    : "Create Venue"}
                </h2>
              </div>

              <button
                type="button"
                className="movie-modal-close"
                onClick={
                  closeScreenModal
                }
                disabled={isSaving}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <div className="screening-modal-body">
              <div className="form-field">
                <label htmlFor="venue-name">
                  Venue / Location Name
                </label>

                <div className="form-input-icon-wrap">
                  <MapPin size={14} />

                  <input
                    id="venue-name"
                    type="text"
                    value={
                      screenForm.name
                    }
                    onChange={(event) =>
                      setScreenForm(
                        (current) => ({
                          ...current,
                          name: event.target
                            .value,
                        }),
                      )
                    }
                    placeholder="e.g. Shree Ganesh Hall"
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              <div className="form-two-column">
                <div className="form-field">
                  <label htmlFor="venue-capacity">
                    Audience Capacity
                  </label>

                  <div className="form-input-icon-wrap">
                    <Users size={14} />

                    <input
                      id="venue-capacity"
                      type="number"
                      min="1"
                      step="1"
                      value={
                        screenForm.capacity
                      }
                      onChange={(event) =>
                        setScreenForm(
                          (current) => ({
                            ...current,
                            capacity:
                              event.target
                                .value,
                          }),
                        )
                      }
                      placeholder="e.g. 120"
                      required
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="venue-map">
                    Google Maps Link
                  </label>

                  <div className="form-input-icon-wrap">
                    <MapPin size={14} />

                    <input
                      id="venue-map"
                      type="url"
                      value={
                        screenForm.google_maps_url
                      }
                      onChange={(event) =>
                        setScreenForm(
                          (current) => ({
                            ...current,
                            google_maps_url:
                              event.target
                                .value,
                          }),
                        )
                      }
                      placeholder="https://maps.google.com/..."
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>

              <div className="show-form-note">
                <MapPin size={13} />

                <span>
                  Add the exact venue location
                  so customers can open it in
                  Google Maps from the public
                  show selector.
                </span>
              </div>

              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={
                    screenForm.is_active
                  }
                  onChange={(event) =>
                    setScreenForm(
                      (current) => ({
                        ...current,
                        is_active:
                          event.target
                            .checked,
                      }),
                    )
                  }
                />

                <span>
                  <strong>
                    Venue is active
                  </strong>

                  <small>
                    Active venues can receive
                    new shows.
                  </small>
                </span>
              </label>
            </div>

            <div className="screening-modal-footer">
              <button
                type="button"
                className="modal-secondary-button"
                onClick={
                  closeScreenModal
                }
                disabled={isSaving}
              >
                CANCEL
              </button>

              <button
                type="submit"
                className="admin-screenings-primary"
                disabled={isSaving}
              >
                {isSaving ? (
                  "SAVING..."
                ) : (
                  <>
                    <Check size={14} />
                    {editingScreen
                      ? "SAVE VENUE"
                      : "CREATE VENUE"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeModal === "show" && (
        <div
          className="screening-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeShowModal();
            }
          }}
        >
          <form
            className="screening-modal"
            onSubmit={handleSaveShow}
          >
            <div className="screening-modal-header">
              <div>
                <p>
                  SHOW SCHEDULE
                </p>

                <h2>
                  {editingShow
                    ? "Edit Show"
                    : "Create Show"}
                </h2>
              </div>

              <button
                type="button"
                className="movie-modal-close"
                onClick={
                  closeShowModal
                }
                disabled={isSaving}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <div className="screening-modal-body">
              <div className="form-field">
                <label htmlFor="show-movie">
                  Movie
                </label>

                <div className="form-select-wrap">
                  <Film size={14} />

                  <select
                    id="show-movie"
                    className="screening-select"
                    value={
                      showForm.movie_id
                    }
                    onChange={(event) =>
                      setShowForm(
                        (current) => ({
                          ...current,
                          movie_id:
                            event.target
                              .value,
                        }),
                      )
                    }
                    required
                  >
                    <option value="">
                      Select a movie
                    </option>

                    {activeMovies.map(
                      (movie) => (
                        <option
                          key={movie.id}
                          value={movie.id}
                        >
                          {movie.title} ·{" "}
                          {movie.release_status ===
                          "now_showing"
                            ? "Now Showing"
                            : "Coming Soon"}
                        </option>
                      ),
                    )}
                  </select>

                  <ChevronDown
                    size={13}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="show-venue">
                  Venue
                </label>

                <div className="form-select-wrap">
                  <MapPin size={14} />

                  <select
                    id="show-venue"
                    className="screening-select"
                    value={
                      showForm.screen_id
                    }
                    onChange={(event) =>
                      setShowForm(
                        (current) => ({
                          ...current,
                          screen_id:
                            event.target
                              .value,
                        }),
                      )
                    }
                    required
                  >
                    <option value="">
                      Select a venue
                    </option>

                    {screens
                      .filter(
                        (screen) =>
                          screen.is_active ||
                          screen.id ===
                            editingShow?.screen_id,
                      )
                      .map(
                        (screen) => (
                          <option
                            key={
                              screen.id
                            }
                            value={
                              screen.id
                            }
                          >
                            {screen.name}
                          </option>
                        ),
                      )}
                  </select>

                  <ChevronDown
                    size={13}
                  />
                </div>
              </div>

              <div className="form-two-column">
                <div className="form-field">
                  <label htmlFor="show-date">
                    Date
                  </label>

                  <div className="form-input-icon-wrap">
                    <CalendarDays
                      size={14}
                    />

                    <input
                      id="show-date"
                      type="date"
                      value={
                        showForm.show_date
                      }
                      onChange={(event) =>
                        setShowForm(
                          (current) => ({
                            ...current,
                            show_date:
                              event.target
                                .value,
                          }),
                        )
                      }
                      required
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="show-time">
                    Time
                  </label>

                  <div className="form-input-icon-wrap">
                    <Clock3
                      size={14}
                    />

                    <input
                      id="show-time"
                      type="time"
                      value={
                        showForm.show_time
                      }
                      onChange={(event) =>
                        setShowForm(
                          (current) => ({
                            ...current,
                            show_time:
                              event.target
                                .value,
                          }),
                        )
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pricing-builder">
                <div className="pricing-builder-header">
                  <div>
                    <span className="pricing-builder-kicker">
                      TICKET PRICING
                    </span>
                    <h3>
                      Group Packages
                    </h3>
                    <p>
                      Set the price per person for each group size. CINETARA never invents a price.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="pricing-add-button"
                    onClick={() =>
                      setPricingTiers((current) => [
                        ...current,
                        {
                          group_size: "",
                          price_per_person: "",
                        },
                      ])
                    }
                  >
                    <Plus size={13} />
                    ADD PACKAGE
                  </button>
                </div>

                <div className="pricing-tier-list">
                  {pricingTiers.map((tier, index) => (
                    <div
                      className={`pricing-tier-row ${
                        index === 0
                          ? "pricing-tier-primary"
                          : ""
                      }`}
                      key={`pricing-${index}`}
                    >
                      <div className="pricing-tier-number">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div className="pricing-tier-field">
                        <label>
                          GROUP SIZE
                        </label>
                        <div className="pricing-tier-input">
                          <Users size={12} />
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={tier.group_size}
                            onChange={(event) =>
                              setPricingTiers((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        group_size:
                                          event.target.value,
                                      }
                                    : item,
                                ),
                              )
                            }
                            placeholder="1"
                            disabled={index === 0}
                          />
                          <span>PEOPLE</span>
                        </div>
                      </div>

                      <div className="pricing-tier-field">
                        <label>
                          PRICE / PERSON
                        </label>
                        <div className="pricing-tier-input">
                          <span className="pricing-rupee">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={tier.price_per_person}
                            onChange={(event) =>
                              setPricingTiers((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        price_per_person:
                                          event.target.value,
                                      }
                                    : item,
                                ),
                              )
                            }
                            placeholder="300"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        className="pricing-remove-button"
                        onClick={() =>
                          setPricingTiers((current) =>
                            current.filter(
                              (_, itemIndex) =>
                                itemIndex !== index,
                            ),
                          )
                        }
                        disabled={index === 0}
                        title={
                          index === 0
                            ? "The 1-person package is required"
                            : "Remove package"
                        }
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pricing-builder-note">
                  <Check size={13} />
                  <span>
                    The <strong>1 person</strong> package is the single-person price. Additional people beyond a configured group package use this single-person price until another package is reached.
                  </span>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="show-status">
                  Status
                </label>

                <div className="form-select-wrap">
                  <select
                    id="show-status"
                    className="screening-select"
                    value={
                      showForm.status
                    }
                    onChange={(event) =>
                      setShowForm(
                        (current) => ({
                          ...current,
                          status:
                            event.target
                              .value as ShowStatus,
                        }),
                      )
                    }
                  >
                    {showStatusOptions.map(
                      (option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ),
                    )}
                  </select>

                  <ChevronDown size={13} />
                </div>
              </div>

              <div className="show-form-note">
                <MonitorPlay
                  size={13}
                />

                <span>
                  Shows are venue-based. Customers
                  choose a show time and venue;
                  CINETARA does not use assigned
                  seating.
                </span>
              </div>
            </div>

            <div className="screening-modal-footer">
              <button
                type="button"
                className="modal-secondary-button"
                onClick={
                  closeShowModal
                }
                disabled={isSaving}
              >
                CANCEL
              </button>

              <button
                type="submit"
                className="admin-screenings-primary"
                disabled={isSaving}
              >
                {isSaving ? (
                  "SAVING..."
                ) : (
                  <>
                    <Check size={14} />
                    {editingShow
                      ? "SAVE SHOW"
                      : "CREATE SHOW"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeModal ===
        "delete-screen" &&
        deletingScreen && (
          <div
            className="screening-modal-backdrop"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeDeleteScreen();
              }
            }}
          >
            <div className="screening-delete-modal">
              <div className="screening-delete-icon">
                <Trash2 size={20} />
              </div>

              <p className="screening-panel-kicker">
                DELETE VENUE
              </p>

              <h2>
                Delete "
                {
                  deletingScreen.name
                }
                "?
              </h2>

              <p>
                This venue will be permanently
                removed. A venue with linked shows
                cannot be deleted.
              </p>
              {deleteModalError && (
                <div className="screening-delete-error" role="alert">
                  <ShieldAlert size={14} />
                  <span>{deleteModalError}</span>
                </div>
              )}

              <div className="screening-modal-footer">
                <button
                  type="button"
                  className="modal-secondary-button"
                  onClick={
                    closeDeleteScreen
                  }
                  disabled={isSaving}
                >
                  CANCEL
                </button>

                <button
                  type="button"
                  className="screen-delete-confirm"
                  onClick={
                    handleDeleteScreen
                  }
                  disabled={isSaving}
                >
                  {isSaving
                    ? "DELETING..."
                    : "DELETE VENUE"}
                </button>
              </div>
            </div>
          </div>
        )}

      {activeModal ===
        "delete-show" &&
        deletingShow && (
          <div
            className="screening-modal-backdrop"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeDeleteShow();
              }
            }}
          >
            <div className="screening-delete-modal">
              <div className="screening-delete-icon">
                <Trash2 size={20} />
              </div>

              <p className="screening-panel-kicker">
                DELETE SHOW
              </p>

              <h2>
                Delete this show?
              </h2>

              <p>
                {deletingShow.movie
                  ?.title ||
                  "This movie"}{" "}
                ·{" "}
                {formatDate(
                  deletingShow.show_date,
                )}{" "}
                ·{" "}
                {formatTime(
                  deletingShow.show_time,
                )}
                <br />
                {
                  deletingShow.screen
                    ?.name
                }
              </p>
              {deleteModalError && (
                <div className="screening-delete-error" role="alert">
                  <ShieldAlert size={14} />
                  <span>{deleteModalError}</span>
                </div>
              )}

              <div className="screening-modal-footer">
                <button
                  type="button"
                  className="modal-secondary-button"
                  onClick={
                    closeDeleteShow
                  }
                  disabled={isSaving}
                >
                  CANCEL
                </button>

                <button
                  type="button"
                  className="screen-delete-confirm"
                  onClick={
                    handleDeleteShow
                  }
                  disabled={isSaving}
                >
                  {isSaving
                    ? "DELETING..."
                    : "DELETE SHOW"}
                </button>
              </div>
            </div>
          </div>
        )}

      {modalIsOpen && (
        <span
          className="admin-screenings-modal-state"
          aria-hidden="true"
        />
      )}
    </div>
  );
}