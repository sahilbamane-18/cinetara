import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Archive,
  ArrowLeft,
  Check,
  Film,
  Image as ImageIcon,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import "./AdminMovies.css";

type ReleaseStatus =
  | "now_showing"
  | "coming_soon"
  | "archived";

type Movie = {
  id: string;
  title: string;
  slug: string | null;
  genre: string | null;
  language: string | null;
  duration_minutes: number | null;
  rating: string | null;
  description: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  release_status: ReleaseStatus;
  archived_from_status:
    | "now_showing"
    | "coming_soon"
    | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type FormState = {
  title: string;
  genre: string;
  language: string;
  duration_minutes: string;
  rating: string;
  description: string;
  release_status: ReleaseStatus;
  sort_order: string;
  poster_url: string;
  backdrop_url: string;
};

type Tab = "all" | ReleaseStatus;

const emptyForm: FormState = {
  title: "",
  genre: "",
  language: "",
  duration_minutes: "",
  rating: "",
  description: "",
  release_status: "coming_soon",
  sort_order: "0",
  poster_url: "",
  backdrop_url: "",
};

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function extensionFromFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "jpeg") {
    return "jpg";
  }

  return extension || "jpg";
}

function formatDuration(minutes: number | null) {
  if (!minutes) {
    return "—";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function statusLabel(status: ReleaseStatus) {
  if (status === "now_showing") {
    return "Now Showing";
  }

  if (status === "coming_soon") {
    return "Coming Soon";
  }

  return "Archived";
}

function statusClass(status: ReleaseStatus) {
  if (status === "now_showing") {
    return "status-now";
  }

  if (status === "coming_soon") {
    return "status-coming";
  }

  return "status-archived";
}

export default function AdminMovies() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingMovie, setEditingMovie] =
    useState<Movie | null>(null);

  const [movieToDelete, setMovieToDelete] =
    useState<Movie | null>(null);

  const [form, setForm] =
    useState<FormState>(emptyForm);

  const [posterFile, setPosterFile] =
    useState<File | null>(null);

  const [backdropFile, setBackdropFile] =
    useState<File | null>(null);

  const [posterPreview, setPosterPreview] = useState("");
  const [backdropPreview, setBackdropPreview] =
    useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteError, setDeleteError] = useState("");

  async function loadMovies() {
    setIsLoading(true);
    setError("");

    const { data, error: moviesError } =
      await supabase
        .from("movies")
        .select("*")
        .order("sort_order", {
          ascending: true,
        })
        .order("created_at", {
          ascending: false,
        });

    if (moviesError) {
      setError(moviesError.message);
      setMovies([]);
      setIsLoading(false);
      return;
    }

    setMovies((data ?? []) as Movie[]);
    setIsLoading(false);
  }

  useEffect(() => {
    loadMovies();
  }, []);

  const counts = useMemo(() => {
    return {
      all: movies.length,

      now_showing: movies.filter(
        (movie) =>
          movie.release_status === "now_showing",
      ).length,

      coming_soon: movies.filter(
        (movie) =>
          movie.release_status === "coming_soon",
      ).length,

      archived: movies.filter(
        (movie) =>
          movie.release_status === "archived",
      ).length,
    };
  }, [movies]);

  const filteredMovies = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    return movies.filter((movie) => {
      const matchesTab =
        activeTab === "all" ||
        movie.release_status === activeTab;

      if (!matchesTab) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        movie.title,
        movie.genre,
        movie.language,
        movie.rating,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(normalizedSearch),
        );
    });
  }, [movies, activeTab, searchTerm]);

  function resetEditor() {
    setEditingMovie(null);
    setForm(emptyForm);
    setPosterFile(null);
    setBackdropFile(null);
    setPosterPreview("");
    setBackdropPreview("");
    setError("");
  }

  function openCreateEditor() {
    resetEditor();
    setIsEditorOpen(true);
  }

  function openEditEditor(movie: Movie) {
    setEditingMovie(movie);

    setForm({
      title: movie.title,
      genre: movie.genre ?? "",
      language: movie.language ?? "",
      duration_minutes: movie.duration_minutes
        ? String(movie.duration_minutes)
        : "",
      rating: movie.rating ?? "",
      description: movie.description ?? "",
      release_status: movie.release_status,
      sort_order: String(movie.sort_order),
      poster_url: movie.poster_url ?? "",
      backdrop_url: movie.backdrop_url ?? "",
    });

    setPosterFile(null);
    setBackdropFile(null);

    setPosterPreview(
      movie.poster_url ?? "",
    );

    setBackdropPreview(
      movie.backdrop_url ?? "",
    );

    setError("");
    setIsEditorOpen(true);
  }

  function closeEditor() {
    if (isSaving) {
      return;
    }

    setIsEditorOpen(false);
    resetEditor();
  }

  function handleFieldChange(
    field: keyof FormState,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function validateImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return false;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError(
        "Each image must be 8 MB or smaller.",
      );
      return false;
    }

    return true;
  }

  function handlePosterChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!validateImage(file)) {
      event.target.value = "";
      return;
    }

    setError("");
    setPosterFile(file);

    const objectUrl =
      URL.createObjectURL(file);

    setPosterPreview(objectUrl);
  }

  function handleBackdropChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!validateImage(file)) {
      event.target.value = "";
      return;
    }

    setError("");
    setBackdropFile(file);

    const objectUrl =
      URL.createObjectURL(file);

    setBackdropPreview(objectUrl);
  }

  async function createUniqueSlug(
    title: string,
    currentId?: string,
  ) {
    const baseSlug =
      slugify(title) ||
      `movie-${Date.now()}`;

    let candidate = baseSlug;
    let counter = 2;

    while (true) {
      let query = supabase
        .from("movies")
        .select("id")
        .eq("slug", candidate)
        .limit(1);

      if (currentId) {
        query = query.neq(
          "id",
          currentId,
        );
      }

      const {
        data,
        error: slugError,
      } = await query;

      if (slugError) {
        throw slugError;
      }

      if (!data || data.length === 0) {
        return candidate;
      }

      candidate =
        `${baseSlug}-${counter}`;

      counter += 1;
    }
  }

  async function uploadMovieImage(
    file: File,
    movieId: string,
    type: "poster" | "backdrop",
  ) {
    const extension =
      extensionFromFile(file);

    const path =
      `movies/${movieId}/${type}-${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const {
      error: uploadError,
    } = await supabase.storage
      .from("movie-assets")
      .upload(
        path,
        file,
        {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        },
      );

    if (uploadError) {
      throw uploadError;
    }

    const { data } =
      supabase.storage
        .from("movie-assets")
        .getPublicUrl(path);

    return {
      path,
      url: data.publicUrl,
    };
  }

  async function deleteStorageFileFromUrl(
    url: string | null,
  ) {
    if (!url) {
      return;
    }

    const marker =
      "/storage/v1/object/public/movie-assets/";

    const index =
      url.indexOf(marker);

    if (index === -1) {
      return;
    }

    const path = decodeURIComponent(
      url.substring(
        index + marker.length,
      ),
    );

    if (!path) {
      return;
    }

    const {
      error: removeError,
    } = await supabase.storage
      .from("movie-assets")
      .remove([path]);

    if (removeError) {
      throw removeError;
    }
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError(
        "Movie title is required.",
      );
      return;
    }

    const duration =
      form.duration_minutes.trim()
        ? Number(
            form.duration_minutes,
          )
        : null;

    if (
      duration !== null &&
      (!Number.isInteger(duration) ||
        duration <= 0)
    ) {
      setError(
        "Duration must be a positive whole number of minutes.",
      );
      return;
    }

    const sortOrder =
      Number(form.sort_order);

    if (
      !Number.isInteger(sortOrder) ||
      sortOrder < 0
    ) {
      setError(
        "Display order must be a whole number starting from 0.",
      );
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    const uploadedPaths: string[] = [];

    try {
      const movieId =
        editingMovie?.id ??
        crypto.randomUUID();

      const slug =
        await createUniqueSlug(
          form.title,
          editingMovie?.id,
        );

      let posterUrl =
        form.poster_url || null;

      let backdropUrl =
        form.backdrop_url || null;

      let newPosterPath:
        | string
        | null = null;

      let newBackdropPath:
        | string
        | null = null;

      if (posterFile) {
        const uploadedPoster =
          await uploadMovieImage(
            posterFile,
            movieId,
            "poster",
          );

        posterUrl =
          uploadedPoster.url;

        newPosterPath =
          uploadedPoster.path;

        uploadedPaths.push(
          uploadedPoster.path,
        );
      }

      if (backdropFile) {
        const uploadedBackdrop =
          await uploadMovieImage(
            backdropFile,
            movieId,
            "backdrop",
          );

        backdropUrl =
          uploadedBackdrop.url;

        newBackdropPath =
          uploadedBackdrop.path;

        uploadedPaths.push(
          uploadedBackdrop.path,
        );
      }

      /*
       * Archive lifecycle handling:
       *
       * If a movie is being archived,
       * remember its current active status.
       *
       * If an archived movie is manually
       * changed back to an active status
       * through Edit, clear the old archive
       * state because the movie is active again.
       */
      let archivedFromStatus =
        editingMovie?.archived_from_status ??
        null;

      if (
        form.release_status ===
        "archived"
      ) {
        if (
          editingMovie &&
          editingMovie.release_status !==
            "archived"
        ) {
          archivedFromStatus =
            editingMovie.release_status;
        } else if (
          !archivedFromStatus
        ) {
          archivedFromStatus =
            "coming_soon";
        }
      } else {
        archivedFromStatus = null;
      }

      const moviePayload = {
        id: movieId,
        title: form.title.trim(),
        slug,
        genre:
          form.genre.trim() || null,
        language:
          form.language.trim() || null,
        duration_minutes: duration,
        rating:
          form.rating.trim() || null,
        description:
          form.description.trim() ||
          null,
        poster_url: posterUrl,
        backdrop_url: backdropUrl,
        release_status:
          form.release_status,
        archived_from_status:
          archivedFromStatus,
        sort_order: sortOrder,
      };

      if (editingMovie) {
        const {
          error: updateError,
        } = await supabase
          .from("movies")
          .update(moviePayload)
          .eq(
            "id",
            editingMovie.id,
          );

        if (updateError) {
          throw updateError;
        }

        if (
          newPosterPath &&
          editingMovie.poster_url &&
          editingMovie.poster_url !==
            posterUrl
        ) {
          await deleteStorageFileFromUrl(
            editingMovie.poster_url,
          );
        }

        if (
          newBackdropPath &&
          editingMovie.backdrop_url &&
          editingMovie.backdrop_url !==
            backdropUrl
        ) {
          await deleteStorageFileFromUrl(
            editingMovie.backdrop_url,
          );
        }

        setSuccess(
          "Movie updated successfully.",
        );
      } else {
        const {
          error: insertError,
        } = await supabase
          .from("movies")
          .insert(moviePayload);

        if (insertError) {
          throw insertError;
        }

        setSuccess(
          "Movie added successfully.",
        );
      }

      await loadMovies();

      setIsEditorOpen(false);
      resetEditor();
    } catch (saveError) {
      if (
        uploadedPaths.length > 0
      ) {
        await supabase.storage
          .from("movie-assets")
          .remove(
            uploadedPaths,
          );
      }

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save movie.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function changeMovieStatus(
    movie: Movie,
    status: ReleaseStatus,
  ) {
    setError("");
    setSuccess("");

    let archivedFromStatus =
      movie.archived_from_status;

    /*
     * When archiving, remember the status
     * the movie currently has.
     */
    if (
      status === "archived" &&
      movie.release_status !==
        "archived"
    ) {
      archivedFromStatus =
        movie.release_status;
    }

    /*
     * When restoring, use the stored
     * previous status.
     *
     * Fallback is Coming Soon for any
     * old movie that was archived before
     * this feature existed.
     */
    if (
      movie.release_status ===
        "archived" &&
      status === "coming_soon"
    ) {
      const restoreStatus =
        movie.archived_from_status ??
        "coming_soon";

      const {
        error: updateError,
      } = await supabase
        .from("movies")
        .update({
          release_status:
            restoreStatus,
          archived_from_status:
            null,
        })
        .eq(
          "id",
          movie.id,
        );

      if (updateError) {
        setError(
          updateError.message,
        );
        return;
      }

      setMovies((current) =>
        current.map((item) =>
          item.id === movie.id
            ? {
                ...item,
                release_status:
                  restoreStatus,
                archived_from_status:
                  null,
              }
            : item,
        ),
      );

      setSuccess(
        `"${movie.title}" restored to ${statusLabel(
          restoreStatus,
        ).toLowerCase()}.`,
      );

      return;
    }

    const {
      error: updateError,
    } = await supabase
      .from("movies")
      .update({
        release_status: status,
        archived_from_status:
          status === "archived"
            ? archivedFromStatus
            : null,
      })
      .eq(
        "id",
        movie.id,
      );

    if (updateError) {
      setError(
        updateError.message,
      );
      return;
    }

    setMovies((current) =>
      current.map((item) =>
        item.id === movie.id
          ? {
              ...item,
              release_status:
                status,
              archived_from_status:
                status === "archived"
                  ? archivedFromStatus
                  : null,
            }
          : item,
      ),
    );

    setSuccess(
      status === "archived"
        ? `"${movie.title}" has been archived.`
        : `"${movie.title}" is now ${statusLabel(
            status,
          ).toLowerCase()}.`,
    );
  }

  function openDeleteConfirmation(
    movie: Movie,
  ) {
    setError("");
    setSuccess("");
    setDeleteError("");
    setMovieToDelete(movie);
  }

  function closeDeleteConfirmation() {
    if (isDeleting) {
      return;
    }

    setMovieToDelete(null);
    setDeleteError("");
  }

  async function handleDeleteMovie() {
    if (!movieToDelete || isDeleting) {
      return;
    }

    const movie = movieToDelete;

    setIsDeleting(true);
    setDeleteError("");
    setError("");
    setSuccess("");

    try {
      /*
       * A movie becomes historical data as soon as it has
       * screenings or bookings. Never hard-delete that record.
       * Archive it instead so booking history remains intact.
       */
      const [
        { data: relatedShows, error: showsError },
        { data: relatedBookings, error: bookingsError },
      ] = await Promise.all([
        supabase
          .from("shows")
          .select("id")
          .eq("movie_id", movie.id)
          .limit(1),
        supabase
          .from("movie_bookings")
          .select("id")
          .eq("movie_id", movie.id)
          .limit(1),
      ]);

      if (showsError) {
        throw showsError;
      }

      if (bookingsError) {
        throw bookingsError;
      }

      if (
        (relatedShows && relatedShows.length > 0) ||
        (relatedBookings && relatedBookings.length > 0)
      ) {
        setDeleteError(
          "This movie has screening or booking history and cannot be permanently deleted. Archive it instead to preserve CINETARA records."
        );
        return;
      }

      const { error: deleteErrorFromDb } = await supabase
        .from("movies")
        .delete()
        .eq("id", movie.id);

      if (deleteErrorFromDb) {
        throw deleteErrorFromDb;
      }

      const storageErrors: string[] = [];

      for (const imageUrl of [
        movie.poster_url,
        movie.backdrop_url,
      ]) {
        try {
          await deleteStorageFileFromUrl(imageUrl);
        } catch (storageError) {
          storageErrors.push(
            storageError instanceof Error
              ? storageError.message
              : "Unknown storage error",
          );
        }
      }

      setMovies((current) =>
        current.filter((item) => item.id !== movie.id),
      );

      setMovieToDelete(null);
      setDeleteError("");

      if (storageErrors.length > 0) {
        setSuccess(
          `"${movie.title}" was deleted, but one or more image files could not be removed from storage.`,
        );
      } else {
        setSuccess(
          `"${movie.title}" was permanently deleted.`,
        );
      }
    } catch (deleteError) {
      setDeleteError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete movie.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="admin-movies-page">
      <div className="admin-movies-header">
        <div>
          <div className="admin-eyebrow">
            <Film size={14} />
            Movie Manager
          </div>

          <h1>
            Build the CINETARA library.
          </h1>

          <p>
            Add films, control artwork,
            manage release status and
            prepare the catalogue for
            screenings.
          </p>
        </div>

        <button
          type="button"
          className="admin-primary-button"
          onClick={openCreateEditor}
        >
          <Plus size={18} />
          Add Movie
        </button>
      </div>

      {success && (
        <div className="admin-feedback success">
          <Check size={17} />
          <span>{success}</span>

          <button
            type="button"
            onClick={() =>
              setSuccess("")
            }
            aria-label="Dismiss success message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && !isEditorOpen && (
        <div className="admin-feedback error">
          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            aria-label="Dismiss error message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="movie-stat-grid">
        <button
          type="button"
          className={`movie-stat-card ${
            activeTab === "all"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setActiveTab("all")
          }
        >
          <span>Total Library</span>
          <strong>
            {counts.all}
          </strong>
        </button>

        <button
          type="button"
          className={`movie-stat-card ${
            activeTab ===
            "now_showing"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setActiveTab(
              "now_showing",
            )
          }
        >
          <span>Now Showing</span>
          <strong>
            {counts.now_showing}
          </strong>
        </button>

        <button
          type="button"
          className={`movie-stat-card ${
            activeTab ===
            "coming_soon"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setActiveTab(
              "coming_soon",
            )
          }
        >
          <span>Coming Soon</span>
          <strong>
            {counts.coming_soon}
          </strong>
        </button>

        <button
          type="button"
          className={`movie-stat-card ${
            activeTab === "archived"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setActiveTab("archived")
          }
        >
          <span>Archived</span>
          <strong>
            {counts.archived}
          </strong>
        </button>
      </div>

      <div className="movie-library-toolbar">
        <div className="movie-tabs">
          <button
            type="button"
            className={
              activeTab === "all"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab("all")
            }
          >
            All
          </button>

          <button
            type="button"
            className={
              activeTab ===
              "now_showing"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "now_showing",
              )
            }
          >
            Now Showing
          </button>

          <button
            type="button"
            className={
              activeTab ===
              "coming_soon"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "coming_soon",
              )
            }
          >
            Coming Soon
          </button>

          <button
            type="button"
            className={
              activeTab ===
              "archived"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "archived",
              )
            }
          >
            Archived
          </button>
        </div>

        <label className="movie-search">
          <Search size={17} />

          <input
            type="search"
            placeholder="Search movies..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value,
              )
            }
          />
        </label>
      </div>

      {isLoading ? (
        <div className="movie-empty-state">
          <div className="movie-loading-mark">
            <Film size={24} />
          </div>

          <h2>
            Loading movie library...
          </h2>

          <p>
            Connecting to CINETARA's
            movie database.
          </p>
        </div>
      ) : filteredMovies.length ===
        0 ? (
        <div className="movie-empty-state">
          <div className="movie-loading-mark">
            <Film size={24} />
          </div>

          <h2>
            {searchTerm
              ? "No matching movies."
              : activeTab === "all"
                ? "Your movie library is empty."
                : `No ${statusLabel(
                    activeTab,
                  ).toLowerCase()} movies yet.`}
          </h2>

          <p>
            {searchTerm
              ? "Try another title, genre, language or rating."
              : "Add your first movie to start building CINETARA."}
          </p>

          {!searchTerm && (
            <button
              type="button"
              className="admin-secondary-button"
              onClick={
                openCreateEditor
              }
            >
              <Plus size={17} />
              Add First Movie
            </button>
          )}
        </div>
      ) : (
        <div className="movie-library-grid">
          {filteredMovies.map(
            (movie) => (
              <article
                className="movie-admin-card"
                key={movie.id}
              >
                <div className="movie-admin-poster">
                  {movie.poster_url ? (
                    <img
                      src={
                        movie.poster_url
                      }
                      alt={
                        movie.title
                      }
                    />
                  ) : (
                    <div className="movie-no-poster">
                      <ImageIcon
                        size={30}
                      />
                      <span>
                        No poster
                      </span>
                    </div>
                  )}

                  <span
                    className={`movie-status-badge ${statusClass(
                      movie.release_status,
                    )}`}
                  >
                    {statusLabel(
                      movie.release_status,
                    )}
                  </span>

                  <span className="movie-order-badge">
                    #{movie.sort_order}
                  </span>
                </div>

                <div className="movie-admin-card-content">
                  <div className="movie-admin-title-row">
                    <div>
                      <h2>
                        {movie.title}
                      </h2>

                      <div className="movie-admin-meta">
                        {movie.genre && (
                          <span>
                            {
                              movie.genre
                            }
                          </span>
                        )}

                        {movie.language && (
                          <span>
                            {
                              movie.language
                            }
                          </span>
                        )}

                        {movie.duration_minutes && (
                          <span>
                            {formatDuration(
                              movie.duration_minutes,
                            )}
                          </span>
                        )}

                        {movie.rating && (
                          <span>
                            {
                              movie.rating
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="movie-admin-description">
                    {movie.description ||
                      "No description added yet."}
                  </p>

                  <div className="movie-admin-actions">
                    <button
                      type="button"
                      className="admin-card-button"
                      onClick={() =>
                        openEditEditor(
                          movie,
                        )
                      }
                    >
                      <Pencil
                        size={15}
                      />
                      Edit
                    </button>

                    {movie.release_status !==
                    "archived" ? (
                      <button
                        type="button"
                        className="admin-card-button subtle-danger"
                        onClick={() =>
                          changeMovieStatus(
                            movie,
                            "archived",
                          )
                        }
                      >
                        <Archive
                          size={15}
                        />
                        Archive
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="admin-card-button"
                        onClick={() =>
                          changeMovieStatus(
                            movie,
                            "coming_soon",
                          )
                        }
                      >
                        <RotateCcw
                          size={15}
                        />
                        Restore
                      </button>
                    )}

                    <button
                      type="button"
                      className="admin-card-button delete-movie-button"
                      onClick={() =>
                        openDeleteConfirmation(
                          movie,
                        )
                      }
                    >
                      <Trash2
                        size={15}
                      />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ),
          )}
        </div>
      )}

      {isEditorOpen && (
        <div
          className="movie-editor-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeEditor();
            }
          }}
        >
          <div className="movie-editor-modal">
            <div className="movie-editor-header">
              <div>
                <div className="admin-eyebrow">
                  <Film size={14} />

                  {editingMovie
                    ? "Edit Movie"
                    : "New Movie"}
                </div>

                <h2>
                  {editingMovie
                    ? "Refine the film."
                    : "Add a new film."}
                </h2>

                <p>
                  Everything here controls
                  how this movie appears
                  throughout CINETARA.
                </p>
              </div>

              <button
                type="button"
                className="movie-close-button"
                onClick={closeEditor}
                disabled={isSaving}
                aria-label="Close movie editor"
              >
                <X size={20} />
              </button>
            </div>

            <form
              className="movie-editor-body"
              onSubmit={handleSave}
            >
              {error && (
                <div className="admin-feedback error editor-error">
                  <span>
                    {error}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setError("")
                    }
                    aria-label="Dismiss error message"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className="movie-editor-layout">
                <div className="movie-form-column">
                  <div className="movie-form-section">
                    <div className="movie-form-section-title">
                      <span>
                        01
                      </span>
                      Movie information
                    </div>

                    <div className="movie-form-grid">
                      <label className="movie-field full">
                        <span>
                          Movie title *
                        </span>

                        <input
                          type="text"
                          value={
                            form.title
                          }
                          onChange={(
                            event,
                          ) =>
                            handleFieldChange(
                              "title",
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="e.g. Interstellar"
                          required
                        />
                      </label>

                      <label className="movie-field">
                        <span>
                          Genre
                        </span>

                        <input
                          type="text"
                          value={
                            form.genre
                          }
                          onChange={(
                            event,
                          ) =>
                            handleFieldChange(
                              "genre",
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="Sci-Fi, Drama"
                        />
                      </label>

                      <label className="movie-field">
                        <span>
                          Language
                        </span>

                        <input
                          type="text"
                          value={
                            form.language
                          }
                          onChange={(
                            event,
                          ) =>
                            handleFieldChange(
                              "language",
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="English"
                        />
                      </label>

                      <label className="movie-field">
                        <span>
                          Duration
                        </span>

                        <div className="movie-input-with-suffix">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={
                              form.duration_minutes
                            }
                            onChange={(
                              event,
                            ) =>
                              handleFieldChange(
                                "duration_minutes",
                                event
                                  .target
                                  .value,
                              )
                            }
                            placeholder="120"
                          />

                          <span>
                            min
                          </span>
                        </div>
                      </label>

                      <label className="movie-field">
                        <span>
                          Certificate / Rating
                        </span>

                        <input
                          type="text"
                          value={
                            form.rating
                          }
                          onChange={(
                            event,
                          ) =>
                            handleFieldChange(
                              "rating",
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="U/A"
                        />
                      </label>

                      <label className="movie-field">
                        <span>
                          Release status
                        </span>

                        <select
                          value={
                            form.release_status
                          }
                          onChange={(
                            event,
                          ) =>
                            handleFieldChange(
                              "release_status",
                              event
                                .target
                                .value as ReleaseStatus,
                            )
                          }
                        >
                          <option value="now_showing">
                            Now Showing
                          </option>

                          <option value="coming_soon">
                            Coming Soon
                          </option>

                          <option value="archived">
                            Archived
                          </option>
                        </select>
                      </label>

                      <label className="movie-field">
                        <span>
                          Display order
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={
                            form.sort_order
                          }
                          onChange={(
                            event,
                          ) =>
                            handleFieldChange(
                              "sort_order",
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="0"
                        />
                      </label>

                      <label className="movie-field full">
                        <span>
                          Description
                        </span>

                        <textarea
                          value={
                            form.description
                          }
                          onChange={(
                            event,
                          ) =>
                            handleFieldChange(
                              "description",
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="Write a concise cinematic description..."
                          rows={5}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="movie-form-section">
                    <div className="movie-form-section-title">
                      <span>
                        02
                      </span>
                      Visual identity
                    </div>

                    <div className="movie-upload-grid">
                      <label className="movie-upload-box">
                        <div className="movie-upload-preview poster">
                          {posterPreview ? (
                            <img
                              src={
                                posterPreview
                              }
                              alt="Poster preview"
                            />
                          ) : (
                            <div className="movie-upload-placeholder">
                              <ImageIcon
                                size={28}
                              />

                              <span>
                                Poster
                              </span>

                              <small>
                                Recommended vertical artwork
                              </small>
                            </div>
                          )}
                        </div>

                        <div className="movie-upload-content">
                          <strong>
                            {posterFile
                              ? posterFile.name
                              : "Upload poster"}
                          </strong>

                          <span>
                            <Upload
                              size={14}
                            />
                            Choose image
                          </span>
                        </div>

                        <input
                          type="file"
                          accept="image/*"
                          onChange={
                            handlePosterChange
                          }
                        />
                      </label>

                      <label className="movie-upload-box">
                        <div className="movie-upload-preview backdrop">
                          {backdropPreview ? (
                            <img
                              src={
                                backdropPreview
                              }
                              alt="Backdrop preview"
                            />
                          ) : (
                            <div className="movie-upload-placeholder">
                              <ImageIcon
                                size={28}
                              />

                              <span>
                                Hero / Backdrop
                              </span>

                              <small>
                                Recommended wide artwork
                              </small>
                            </div>
                          )}
                        </div>

                        <div className="movie-upload-content">
                          <strong>
                            {backdropFile
                              ? backdropFile.name
                              : "Upload hero artwork"}
                          </strong>

                          <span>
                            <Upload
                              size={14}
                            />
                            Choose image
                          </span>
                        </div>

                        <input
                          type="file"
                          accept="image/*"
                          onChange={
                            handleBackdropChange
                          }
                        />
                      </label>
                    </div>

                    <p className="movie-upload-note">
                      Maximum 8 MB per image.
                      Images are stored
                      securely in CINETARA's
                      movie asset storage.
                    </p>
                  </div>
                </div>

                <aside className="movie-live-preview">
                  <div className="movie-preview-label">
                    Customer-facing preview
                  </div>

                  <div
                    className="movie-preview-card"
                    style={{
                      backgroundImage:
                        backdropPreview
                          ? `linear-gradient(
                              180deg,
                              rgba(0,0,0,0.08),
                              rgba(0,0,0,0.88)
                            ),
                            url("${backdropPreview}")`
                          : undefined,
                    }}
                  >
                    <div className="movie-preview-top">
                      <span>
                        CINETARA
                      </span>

                      <span>
                        {form.release_status ===
                        "now_showing"
                          ? "NOW SHOWING"
                          : form.release_status ===
                              "coming_soon"
                            ? "COMING SOON"
                            : "ARCHIVED"}
                      </span>
                    </div>

                    <div className="movie-preview-poster">
                      {posterPreview ? (
                        <img
                          src={
                            posterPreview
                          }
                          alt="Movie poster preview"
                        />
                      ) : (
                        <Film size={32} />
                      )}
                    </div>

                    <div className="movie-preview-info">
                      <h3>
                        {form.title ||
                          "Movie Title"}
                      </h3>

                      <div className="movie-preview-meta">
                        {form.genre && (
                          <span>
                            {
                              form.genre
                            }
                          </span>
                        )}

                        {form.language && (
                          <span>
                            {
                              form.language
                            }
                          </span>
                        )}

                        {form.duration_minutes && (
                          <span>
                            {formatDuration(
                              Number(
                                form.duration_minutes,
                              ),
                            )}
                          </span>
                        )}

                        {form.rating && (
                          <span>
                            {
                              form.rating
                            }
                          </span>
                        )}
                      </div>

                      <p>
                        {form.description ||
                          "Your movie description will appear here."}
                      </p>
                    </div>
                  </div>
                </aside>
              </div>

              <div className="movie-editor-footer">
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={
                    closeEditor
                  }
                  disabled={isSaving}
                >
                  <ArrowLeft
                    size={17}
                  />
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-primary-button"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <span className="movie-spinner" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check
                        size={17}
                      />

                      {editingMovie
                        ? "Save Changes"
                        : "Create Movie"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {movieToDelete && (
        <div
          className="movie-delete-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDeleteConfirmation();
            }
          }}
        >
          <div
            className="movie-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-movie-title"
          >
            <div className="movie-delete-icon">
              <AlertTriangle
                size={24}
              />
            </div>

            <div className="movie-delete-content">
              <div className="admin-eyebrow">
                Permanent action
              </div>

              <h2 id="delete-movie-title">
                Delete "{movieToDelete.title}"?
              </h2>

              <p>
                This will permanently remove
                the movie from CINETARA and
                delete its poster and hero
                artwork from movie storage.
              </p>

              <p className="movie-delete-warning">
                This action cannot be undone.
              </p>
              {deleteError && (
                <div className="movie-delete-error" role="alert">
                  <AlertTriangle size={15} />
                  <span>{deleteError}</span>
                </div>
              )}
            </div>

            <div className="movie-delete-footer">
              <button
                type="button"
                className="admin-secondary-button"
                onClick={
                  closeDeleteConfirmation
                }
                disabled={isDeleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="movie-delete-confirm-button"
                onClick={
                  handleDeleteMovie
                }
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="movie-delete-spinner" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2
                      size={16}
                    />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}