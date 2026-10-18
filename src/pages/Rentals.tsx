import { useEffect, useState } from "react";
import "./Rentals.css";
import { supabase } from "../lib/supabase";

const rentalOptions = [
  {
    number: "01",
    tag: "QUICK & FLEXIBLE",
    title: "Hourly Rental",
    description:
      "Perfect for a movie night, a small gathering, or a short presentation.",
    duration: "A few hours",
    price: "Price on request",
  },
  {
    number: "02",
    tag: "THE CLASSIC",
    title: "Daily Rental",
    description:
      "Enjoy the big-screen experience for a full day of movies and events.",
    duration: "One full day",
    price: "Price on request",
  },
  {
    number: "03",
    tag: "MORE TIME, MORE FUN",
    title: "Multi-day Rental",
    description:
      "A flexible choice for celebrations, events, and longer experiences.",
    duration: "Multiple days",
    price: "Price on request",
  },
];

const experiences = [
  { title: "Movie Night", detail: "A cinema night at home" },
  { title: "Private Screening", detail: "Your own private show" },
  { title: "Special Event", detail: "A celebration on the big screen" },
];

function Rentals() {
  const [selectedRental, setSelectedRental] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [rentalDate, setRentalDate] = useState("");
  const [rentalLocation, setRentalLocation] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const [rentalBudget, setRentalBudget] = useState("");
  const [rentalDuration, setRentalDuration] = useState("");
  const [eventType, setEventType] = useState("");

  // New submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [referenceCode, setReferenceCode] = useState("");

  const openInquiry = (rental = "", event = "") => {
    setSelectedRental(rental);
    setEventType(event);
    setSubmitError("");
    setReferenceCode("");
    setIsInquiryOpen(true);
  };

  const closeInquiry = () => {
    if (isSubmitting) return;
    setIsInquiryOpen(false);
  };

  useEffect(() => {
    if (!isInquiryOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeInquiry();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isInquiryOpen, isSubmitting]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError("");
    setReferenceCode("");

    try {
      const { data, error } = await supabase.rpc("submit_rental_enquiry", {
        p_customer_name: customerName.trim(),
        p_customer_email: customerEmail.trim(),
        p_preferred_date: rentalDate || null,
        p_location: rentalLocation.trim(),
        p_event_type: eventType || null,
        p_expected_duration: rentalDuration.trim() || null,
        p_budget: rentalBudget ? Number(rentalBudget) : null,
        p_message: [
          selectedRental
            ? `Rental package: ${selectedRental}`
            : "Rental package: Not specified",
          customerMessage.trim()
            ? `Special requirements: ${customerMessage.trim()}`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
      });

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("No enquiry reference was returned.");
      }

      setReferenceCode(data);
    } catch (error) {
      console.error("Rental enquiry submission failed:", error);

      setSubmitError(
        "We couldn't submit your enquiry right now. Please try again in a moment."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="rentals-page">
      <header className="rentals-header">
        <a href="/" className="rentals-brand" aria-label="CINETARA homepage">
          <img src="/cinetara-logo.png" alt="CINETARA" />
        </a>

        <a href="/" className="back-home">
          <span aria-hidden="true">←</span> Back to Home
        </a>
      </header>

      <section className="rentals-hero">
        <div className="rentals-hero-copy">
          <p className="rentals-eyebrow">
            <span /> CINETARA / PROJECTOR RENTALS
          </p>

          <h1>
            Your space.
            <br />
            <span>The big screen.</span>
          </h1>

          <p className="rentals-description">
            Turn an ordinary space into your own cinema. Bring people together
            for movie nights, celebrations, and unforgettable moments.
          </p>

          <a className="rentals-button" href="#rental-options">
            Explore rental options <span>↗</span>
          </a>

          <div className="rentals-note">
            <span className="rentals-note-dot" />
            YOUR SPACE. YOUR PEOPLE. YOUR CINEMA.
          </div>
        </div>

        <div
          className="projector-visual"
          role="img"
          aria-label="Cinematic illustration of a projector shining towards a screen"
        >
          <div className="visual-glow" />
          <div className="visual-label">YOUR NEXT MOVIE NIGHT</div>

          <div className="cinema-screen">
            <div className="screen-light">
              <span className="screen-play">▶</span>
              <span className="screen-caption">MAKE IT A MOVIE NIGHT</span>
            </div>
          </div>

          <div className="projector-beam" />

          <div className="projector-device">
            <div className="projector-lens">
              <div />
            </div>

            <div className="projector-body">
              <span />
              <span />
              <span />
            </div>

            <div className="projector-base" />
          </div>

          <div className="visual-bottom-label">
            <span>01 / THE CINETARA EXPERIENCE</span>
            <span>MADE FOR YOUR MOMENTS</span>
          </div>
        </div>
      </section>

      <section className="rental-options" id="rental-options">
        <div className="rental-section-heading">
          <div>
            <p className="rentals-eyebrow">
              <span /> FIND YOUR FIT
            </p>

            <h2>
              One screen. <span>Many ways to enjoy.</span>
            </h2>
          </div>

          <p className="rental-section-description">
            Choose a rental duration that suits your plans. Tell us what you
            have in mind, and we can discuss the right setup for your
            experience.
          </p>
        </div>

        <div className="rental-options-grid">
          {rentalOptions.map((option) => (
            <article className="rental-option" key={option.number}>
              <div className="rental-card-top">
                <span className="rental-card-number">{option.number}</span>

                <span className="rental-card-arrow" aria-hidden="true">
                  ↗
                </span>
              </div>

              <p className="rental-card-tag">{option.tag}</p>

              <h3>{option.title}</h3>

              <p className="rental-card-description">{option.description}</p>

              <div className="rental-card-price">
                <span>ESTIMATED BUDGET</span>
                <strong>{option.price}</strong>
              </div>

              <div className="rental-card-footer">
                <span>{option.duration}</span>

                <button
                  type="button"
                  className="rental-enquire-button"
                  onClick={() => openInquiry(option.title)}
                >
                  Enquire <span>→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="experience-showcase">
        <div className="experience-showcase-heading">
          <div>
            <p className="rentals-eyebrow">
              <span /> MADE FOR THE MOMENT
            </p>

            <h2>
              Moments worth <span>watching.</span>
            </h2>
          </div>

          <p className="experience-showcase-intro">
            From a cosy movie night to a night worth remembering, the best
            experiences are the ones we share.
          </p>
        </div>

        <div
          className="experience-reel"
          aria-label="Cinematic experience gallery"
        >
          <div className="experience-reel-track">
            <article className="experience-frame experience-frame-one">
              <img
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=85"
                alt="Friends spending time together outdoors"
                loading="lazy"
              />

              <div className="experience-frame-overlay">
                <span>01 / TOGETHER IS BETTER</span>
                <h3>Movie Nights</h3>
                <p>Small moments. Big memories.</p>
              </div>
            </article>

            <article className="experience-frame experience-frame-two">
              <img
                src="https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1000&q=85"
                alt="Cinema screen ready for a movie experience"
                loading="lazy"
              />

              <div className="experience-frame-overlay">
                <span>02 / YOUR OWN CINEMA</span>
                <h3>Private Screenings</h3>
                <p>Your space, your story.</p>
              </div>
            </article>

            <article className="experience-frame experience-frame-three">
              <img
                src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1000&q=85"
                alt="A beautifully arranged evening celebration"
                loading="lazy"
              />

              <div className="experience-frame-overlay">
                <span>03 / MAKE IT MEMORABLE</span>
                <h3>Special Occasions</h3>
                <p>Give the gathering a bigger story.</p>
              </div>
            </article>

            {/* Duplicate the frames to create a seamless scrolling reel */}
            <article
              className="experience-frame experience-frame-one"
              aria-hidden="true"
            >
              <img
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=85"
                alt=""
                loading="lazy"
              />

              <div className="experience-frame-overlay">
                <span>01 / TOGETHER IS BETTER</span>
                <h3>Movie Nights</h3>
                <p>Small moments. Big memories.</p>
              </div>
            </article>

            <article
              className="experience-frame experience-frame-two"
              aria-hidden="true"
            >
              <img
                src="https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1000&q=85"
                alt=""
                loading="lazy"
              />

              <div className="experience-frame-overlay">
                <span>02 / YOUR OWN CINEMA</span>
                <h3>Private Screenings</h3>
                <p>Your space, your story.</p>
              </div>
            </article>

            <article
              className="experience-frame experience-frame-three"
              aria-hidden="true"
            >
              <img
                src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1000&q=85"
                alt=""
                loading="lazy"
              />

              <div className="experience-frame-overlay">
                <span>03 / MAKE IT MEMORABLE</span>
                <h3>Special Occasions</h3>
                <p>Give the gathering a bigger story.</p>
              </div>
            </article>
          </div>
        </div>

        <div className="experience-showcase-footer">
          <span>GOOD PEOPLE. GREAT STORIES.</span>

          <span>
            THE CINETARA EXPERIENCE{" "}
            <span className="experience-red-dot">●</span>
          </span>
        </div>
      </section>

      {isInquiryOpen && (
        <div
          className="inquiry-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeInquiry();
          }}
        >
          <div className="inquiry-light" aria-hidden="true">
            {Array.from({ length: 32 }, (_, index) => (
              <span
                key={index}
                className="inquiry-particle"
                style={{
                  left: `${(index * 37) % 100}%`,
                  top: `${(index * 61) % 100}%`,
                  animationDelay: `${(index % 8) * -0.45}s`,
                  animationDuration: `${3 + (index % 5)}s`,
                }}
              />
            ))}
          </div>

          <section
            className="inquiry-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inquiry-title"
          >
            <div className="inquiry-panel-header">
              <div>
                <p className="rentals-eyebrow">
                  <span /> CINETARA / RENTAL INQUIRY
                </p>

                <h2 id="inquiry-title">
                  Let’s set <span>the scene.</span>
                </h2>

                <p className="inquiry-intro">
                  Tell us what you’re planning. We’ll use these details to
                  discuss a suitable setup and quote.
                </p>
              </div>

              <button
                type="button"
                className="inquiry-close"
                aria-label="Close inquiry"
                onClick={closeInquiry}
                disabled={isSubmitting}
              >
                ×
              </button>
            </div>

            {referenceCode ? (
              <div className="rental-inquiry-success">
                <p className="rentals-eyebrow">
                  <span /> INQUIRY RECEIVED
                </p>

                <h3>
                  Your enquiry is <span>on its way.</span>
                </h3>

                <p>
                  Thanks, {customerName || "for reaching out"}. We’ve received
                  your rental enquiry and will review the details.
                </p>

                <div className="rental-reference-box">
                  <span>YOUR REFERENCE</span>
                  <strong>{referenceCode}</strong>
                </div>

                <button
                  type="button"
                  className="rentals-button inquiry-submit"
                  onClick={closeInquiry}
                >
                  Done <span>✓</span>
                </button>
              </div>
            ) : (
              <form
                className="rental-inquiry-form"
                onSubmit={handleSubmit}
              >
                <div>
                  <label htmlFor="rental-duration-option">
                    Rental package *
                  </label>

                  <select
                    id="rental-duration-option"
                    value={selectedRental}
                    onChange={(event) =>
                      setSelectedRental(event.target.value)
                    }
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Choose a package</option>
                    <option value="Hourly Rental">Hourly Rental</option>
                    <option value="Daily Rental">Daily Rental</option>
                    <option value="Multi-day Rental">
                      Multi-day Rental
                    </option>
                  </select>
                </div>

                <div className="rental-form-row">
                  <div>
                    <label htmlFor="customer-name">Full name *</label>

                    <input
                      id="customer-name"
                      value={customerName}
                      onChange={(event) =>
                        setCustomerName(event.target.value)
                      }
                      placeholder="Your name"
                      autoComplete="name"
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label htmlFor="customer-email">
                      Email address *
                    </label>

                    <input
                      id="customer-email"
                      type="email"
                      value={customerEmail}
                      onChange={(event) =>
                        setCustomerEmail(event.target.value)
                      }
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="rental-form-row">
                  <div>
                    <label htmlFor="rental-date">
                      Preferred date *
                    </label>

                    <input
                      id="rental-date"
                      type="date"
                      min={new Date().toLocaleDateString("en-CA")}
                      value={rentalDate}
                      onChange={(event) =>
                        setRentalDate(event.target.value)
                      }
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label htmlFor="rental-location">
                      Event location *
                    </label>

                    <input
                      id="rental-location"
                      value={rentalLocation}
                      onChange={(event) =>
                        setRentalLocation(event.target.value)
                      }
                      placeholder="City or area"
                      autoComplete="address-level2"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="rental-form-row">
                  <div>
                    <label htmlFor="event-type">
                      What’s the occasion?
                    </label>

                    <select
                      id="event-type"
                      value={eventType}
                      onChange={(event) =>
                        setEventType(event.target.value)
                      }
                      disabled={isSubmitting}
                    >
                      <option value="">Select event type</option>
                      <option value="Movie Night">Movie Night</option>
                      <option value="Private Screening">
                        Private Screening
                      </option>
                      <option value="Special Event">
                        Special Event
                      </option>
                      <option value="Birthday or celebration">
                        Birthday or celebration
                      </option>
                      <option value="Corporate event">
                        Corporate event
                      </option>
                      <option value="Other event">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="expected-duration">
                      Expected usage
                    </label>

                    <input
                      id="expected-duration"
                      value={rentalDuration}
                      onChange={(event) =>
                        setRentalDuration(event.target.value)
                      }
                      placeholder="e.g. 4 hours or 2 days"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="rental-budget">
                    Your approximate budget (₹)
                  </label>

                  <input
                    id="rental-budget"
                    type="number"
                    min="0"
                    step="100"
                    value={rentalBudget}
                    onChange={(event) =>
                      setRentalBudget(event.target.value)
                    }
                    placeholder="Enter your budget in rupees"
                    disabled={isSubmitting}
                  />

                  <p className="inquiry-field-note">
                    This helps us discuss options that suit your budget.
                  </p>
                </div>

                <div>
                  <label htmlFor="rental-message">
                    Special requirements
                  </label>

                  <textarea
                    id="rental-message"
                    value={customerMessage}
                    onChange={(event) =>
                      setCustomerMessage(event.target.value)
                    }
                    placeholder="Screen size, audience, indoor/outdoor setup, or anything else..."
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>

                {submitError && (
                  <p className="rental-form-error" role="alert">
                    {submitError}
                  </p>
                )}

                <button
                  type="submit"
                  className="rentals-button inquiry-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      Sending inquiry... <span>...</span>
                    </>
                  ) : (
                    <>
                      Prepare my inquiry <span>↗</span>
                    </>
                  )}
                </button>

                <p className="rental-form-note">
                  Your enquiry will be securely saved with CINETARA. We’ll
                  review your requirements and get back to you.
                </p>
              </form>
            )}
          </section>
        </div>
      )}

      <footer className="rentals-footer">
        <span>© CINETARA</span>
        <span>BRING THE BIG SCREEN CLOSER.</span>
        <a href="/">Back to homepage ↑</a>
      </footer>
    </main>
  );
}

export default Rentals;