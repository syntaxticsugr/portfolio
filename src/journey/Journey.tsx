import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Station } from "../world/World";
import useTheme from "./useTheme";
import Icon from "../ui/Icon";
import CassetteDeck from "./CassetteDeck";
import profile from "../content/profile.json";
import { projects } from "../data";

const World = lazy(() => import("../world/World"));
const Cinema = lazy(() => import("../cinema/Cinema"));
const places: { id: Station; name: string; hint: string; number: string }[] = [
  {
    id: "home",
    name: "The world",
    hint: "A few things that make me, me.",
    number: "00",
  },
  {
    id: "work",
    name: "Experience",
    hint: "Real products. Full ownership.",
    number: "01",
  },
  {
    id: "education",
    name: "Education",
    hint: "School through university.",
    number: "02",
  },
  {
    id: "viper",
    name: "Music",
    hint: "Sound, exactly to my taste.",
    number: "03",
  },
  {
    id: "anime",
    name: "Anime",
    hint: "105 worlds. One more episode.",
    number: "04",
  },
  {
    id: "contact",
    name: "Say hello",
    hint: "The beginning of something good.",
    number: "05",
  },
  {
    id: "food",
    name: "Food court",
    hint: "A table for everyone.",
    number: "06",
  },
];

function Clock() {
  const format = () =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
  const [time, setTime] = useState(format);
  useEffect(() => {
    const id = setInterval(() => setTime(format()), 15000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="world-clock">
      <i aria-hidden="true" />
      <span>CHANDIGARH, IN</span>
      <b>{time}</b>
    </span>
  );
}

function Career() {
  const [jobId, setJobId] = useState("vediq");
  const job = profile.experience.find((item) => item.id === jobId)!;
  return (
    <>
      <div className="panel-eyebrow">
        <span>01</span> EXPERIENCE / PROFESSIONAL LIFE
      </div>
      <h1 tabIndex={-1}>
        From zero.
        <br />
        <em>To shipped.</em>
      </h1>
      <p className="panel-lede">
        I build the app, the backend, the infrastructure — and take
        responsibility for the whole thing.
      </p>
      <div className="company-switch" aria-label="Choose a company">
        {["vediq", "heytheo", "muzee"].map((id) => {
          const item = profile.experience.find((job) => job.id === id)!;
          return (
            <button
              key={id}
              aria-pressed={id === jobId}
              onClick={() => setJobId(id)}
            >
              {item.company}
              <span>{item.end ? "PREVIOUS" : "NOW"}</span>
            </button>
          );
        })}
      </div>
      <article className="job-story" key={jobId} aria-live="polite">
        <div className="job-meta">
          <strong>{job.role}</strong>
          <span>{job.period}</span>
        </div>
        <h2>
          {jobId === "heytheo"
            ? "First engineer. Whole product."
            : jobId === "muzee"
              ? "Giving silent video its sound."
              : "The next first commit."}
        </h2>
        <p>{job.summary}</p>
        {job.reportedMetrics.length > 0 && (
          <div className="job-metrics">
            {job.reportedMetrics.map((metric) => (
              <div key={metric.value}>
                <strong>
                  {metric.value}
                  <span>↓</span>
                </strong>
                <p>
                  {metric.measure === "Reduction in deployment times"
                    ? "Model deployment time"
                    : "Backend operating costs"}
                </p>
              </div>
            ))}
          </div>
        )}
        {job.responsibilities.length > 0 && (
          <details className="job-details">
            <summary>
              The engineering behind it <Icon name="plus" size={18} />
            </summary>
            <ul>
              {job.responsibilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {job.technologies.length > 0 && (
              <p className="job-stack">{job.technologies.join(" / ")}</p>
            )}
            {job.sourceRoles.length > 1 && (
              <div className="earlier-roles">
                <strong>Also held at {job.company}</strong>
                {job.sourceRoles.slice(1).map((item) => (
                  <span key={item.title + item.start}>
                    {item.title} · {item.start} — {item.end ?? "Present"}
                  </span>
                ))}
              </div>
            )}
          </details>
        )}
      </article>
    </>
  );
}

function Education() {
  const formatDate = (date: string) =>
    date.length === 4
      ? date
      : new Intl.DateTimeFormat("en-GB", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(`${date}-01T00:00:00Z`));
  return (
    <>
      <div className="panel-eyebrow">
        <span>02</span> EDUCATION / THE FOUNDATIONS
      </div>
      <h1 tabIndex={-1}>
        Where it
        <br />
        <em>started.</em>
      </h1>
      <p className="panel-lede">From school days to computer science.</p>
      <ol className="education-timeline" aria-label="Education history">
        {profile.education.map((education) => (
          <li key={education.institution}>
            <span className="education-year" aria-hidden="true">
              {education.end.slice(0, 4)}
            </span>
            <article>
              <p className="education-dates">
                {education.start ? (
                  <>
                    <time dateTime={education.start}>
                      {formatDate(education.start)}
                    </time>
                    <span aria-hidden="true"> — </span>
                  </>
                ) : (
                  "Until "
                )}
                <time dateTime={education.end}>
                  {formatDate(education.end)}
                </time>
              </p>
              <h2>{education.institution}</h2>
              <p className="education-location">{education.location}</p>
              <p className="education-degree">
                {education.degree ?? education.degreeAsListed}
              </p>
              {education.field && (
                <p className="education-field">{education.field}</p>
              )}
            </article>
          </li>
        ))}
      </ol>
    </>
  );
}

function ListeningBar({ paused }: { paused: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [tone, setTone] = useState(45);
  const engine = useRef<{
    context: AudioContext;
    filter: BiquadFilterNode;
    gain: GainNode;
  } | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(
    () => () => {
      void engine.current?.context.close();
      engine.current = null;
    },
    [],
  );
  useEffect(() => {
    engine.current?.filter.frequency.setTargetAtTime(
      250 + tone * 52,
      engine.current.context.currentTime,
      0.1,
    );
  }, [tone]);
  const toggle = async () => {
    try {
      if (playing) {
        await engine.current?.context.suspend();
        setPlaying(false);
        return;
      }
      if (!engine.current) {
        const context = new AudioContext();
        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 250 + tone * 52;
        filter.Q.value = 0.6;
        const gain = context.createGain();
        gain.gain.value = 0.055;
        filter.connect(gain);
        gain.connect(context.destination);
        [130.81, 164.81, 196, 261.63, 329.63].forEach((frequency, index) => {
          const osc = context.createOscillator();
          osc.type = index > 2 ? "triangle" : "sine";
          osc.frequency.value = frequency;
          osc.detune.value = index % 2 ? 3 : -3;
          osc.connect(filter);
          osc.start();
        });
        engine.current = { context, filter, gain };
      }
      await engine.current.context.resume();
      setPlaying(true);
      setUnavailable(false);
    } catch {
      setUnavailable(true);
      setPlaying(false);
    }
  };
  return (
    <>
      <div className="panel-eyebrow">
        <span>03</span> MUSIC / ViPER
      </div>
      <h1 tabIndex={-1}>
        Less default.
        <br />
        <em>More feeling.</em>
      </h1>
      <p className="panel-lede">
        Sound is personal. I like getting every little detail of mine just
        right.
      </p>
      <CassetteDeck
        playing={playing}
        paused={paused}
        tone={tone}
        onToggle={toggle}
        onToneChange={setTone}
      />
      <p className="sound-note" role="status">
        {unavailable
          ? "Audio isn’t available in this browser."
          : "An original synthesized chord. Slide from warm to bright."}
      </p>
      <div className="viper-story">
        <h2>ViPER4Android Presets</h2>
        <p>{projects[0].description}</p>
        <a
          className="solid-link"
          href={projects[0].url}
          target="_blank"
          rel="noreferrer"
        >
          Explore the collection <Icon name="arrow" size={18} />
        </a>
      </div>
    </>
  );
}

function Contact() {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <>
      <div className="panel-eyebrow">
        <span>05</span> THE NEXT GOOD THING
      </div>
      <h1 tabIndex={-1}>
        It starts
        <br />
        with <em>hello.</em>
      </h1>
      <p className="panel-lede">
        A product to shape. An AI feature to make useful. A problem that needs
        someone to own it.
      </p>
      <a className="email-main" href={`mailto:${profile.person.email}`}>
        {profile.person.email}
        <Icon name="arrow" />
      </a>
      <button
        className="copy-address"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(profile.person.email);
            setCopied(true);
            setFailed(false);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => setCopied(false), 2500);
          } catch {
            setFailed(true);
          }
        }}
      >
        <span aria-live="polite">
          {copied
            ? "COPIED"
            : failed
              ? "COPY UNAVAILABLE — ADDRESS ABOVE"
              : "COPY EMAIL ADDRESS"}
        </span>
        <Icon name={copied ? "check" : "copy"} size={16} />
      </button>
      <div className="social-addresses">
        {[
          { name: "LinkedIn", url: profile.person.linkedin },
          { name: "GitHub", url: profile.person.github },
          { name: "Telegram", url: profile.person.telegram },
          { name: "WhatsApp", url: profile.person.whatsapp },
        ].map((item, index) => (
          <a key={item.name} href={item.url} target="_blank" rel="noreferrer">
            <span className="micro-label">0{index + 1}</span>
            <span>
              <strong>{item.name}</strong>
              <small>@syntaxticsugr</small>
            </span>
            <Icon name="arrow" />
          </a>
        ))}
      </div>
    </>
  );
}

function stationFromHash(): Station {
  const hash = location.hash.slice(1);
  const aliases: Record<string, Station> = {
    experience: "work",
    hello: "contact",
  };
  return places.find((item) => item.id === hash)?.id ?? aliases[hash] ?? "home";
}

export default function Journey() {
  const journeyRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  const [station, setStation] = useState<Station>(stationFromHash);
  const [manualPause, setManualPause] = useState(false);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [ready, setReady] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const mapRef = useRef<HTMLDialogElement>(null);
  const bearingRef = useRef<HTMLOutputElement>(null);
  const updateBearing = useCallback((degrees: number) => {
    const text = bearingRef.current?.firstChild;
    if (!text) return;
    const direction = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][
      Math.floor((degrees + 22.5) / 45) % 8
    ];
    text.nodeValue = `VIEW FROM ${String(degrees).padStart(3, "0")}° ${direction}`;
  }, []);
  const [visited, setVisited] = useState<Set<Station>>(
    () => new Set([stationFromHash()]),
  );
  const paused = manualPause || reduced;
  useLayoutEffect(() => {
    if (!paused || !journeyRef.current) return;
    const root = journeyRef.current;
    // Complete entrances once; cancelling their CSS animation would replay them on resume.
    const finishEntrances = () => {
      for (const animation of root.getAnimations({ subtree: true })) {
        if (
          animation instanceof CSSAnimation &&
          Number.isFinite(animation.effect?.getTiming().iterations)
        ) {
          animation.finish();
        }
      }
    };
    finishEntrances();
    const observer = new MutationObserver(finishEntrances);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [paused]);
  const navigate = useCallback((next: Station) => {
    if (stationFromHash() !== next) location.hash = next;
    setMapOpen(false);
  }, []);
  useEffect(() => {
    const change = () => setStation(stationFromHash());
    addEventListener("hashchange", change);
    return () => removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    setVisited((previous) => new Set(previous).add(station));
    document.title =
      station === "home"
        ? "syntaxticsugr — Aditya Raj"
        : `${places.find((item) => item.id === station)!.name} — syntaxticsugr`;
    const focusAtNavigation = document.activeElement;
    const id = setTimeout(() => {
      const focused = document.activeElement;
      // Keep a control the visitor has already selected during the entrance.
      if (
        document.querySelector("dialog[open]") ||
        (focused instanceof HTMLElement &&
          focused.closest(
            "a[href],button,input,textarea,select,[contenteditable],[role=textbox],[role=slider]",
          ) &&
          (focused !== focusAtNavigation || focused.closest("main")))
      )
        return;
      document
        .querySelector<HTMLElement>("main h1")
        ?.focus({ preventScroll: true });
    }, 160);
    return () => clearTimeout(id);
  }, [station]);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        (event.target instanceof HTMLElement &&
          (event.target.isContentEditable ||
            event.target.closest("input,textarea,select,[role=textbox]")))
      )
        return;
      const openDialog = document.querySelector("dialog[open]");
      // The map advertises these shortcuts; other dialogs keep their own keys.
      if (openDialog && openDialog !== mapRef.current) return;
      if (/^[1-7]$/.test(event.key)) {
        event.preventDefault();
        navigate(places[Number(event.key) - 1].id);
        return;
      }
      // Let Escape dismiss the map through the dialog's native cancel event.
      if (openDialog) return;
      if (event.key === "Escape" && station !== "home") navigate("home");
    };
    addEventListener("keydown", keyboard);
    return () => removeEventListener("keydown", keyboard);
  }, [navigate, station]);
  useEffect(() => {
    const dialog = mapRef.current;
    if (mapOpen && !dialog?.open) dialog?.showModal();
    else if (!mapOpen && dialog?.open) dialog.close();
  }, [mapOpen]);
  const dark = theme === "dark";
  const inCinema = station === "anime";
  return (
    <div
      ref={journeyRef}
      className={`journey at-${station} ${dark ? "is-dark" : ""} ${paused ? "motion-paused" : ""}`}
      data-theme={theme}
    >
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document
            .querySelector<HTMLElement>("main h1")
            ?.focus({ preventScroll: true });
        }}
      >
        Skip to content
      </a>
      <header className="world-header">
        <a className="world-brand" href="#home" aria-label="syntaxticsugr home">
          <strong>syntaxticsugr</strong>
          <small>Aditya Raj</small>
        </a>
        <Clock />
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
          aria-pressed={dark}
          title={`${dark ? "Dark" : "Light"} theme — switch to ${dark ? "light" : "dark"}`}
        >
          <Icon name={dark ? "moon" : "sun"} size={18} />
          <span>{dark ? "DARK" : "LIGHT"}</span>
        </button>
        <button
          className="map-toggle"
          onClick={() => setMapOpen(true)}
          aria-label="Open world map"
        >
          <Icon name="map" size={20} />
        </button>
      </header>
      <main id="main" className="world-viewport">
        <div className="world-coordinate" aria-hidden="true">
          <output className="world-bearing" ref={bearingRef}>
            VIEW FROM —
          </output>
          <span>AN INDEPENDENT LITTLE UNIVERSE</span>
        </div>
        <div
          className="world-canvas-wrap"
          aria-hidden={inCinema}
          style={inCinema ? { visibility: "hidden" } : undefined}
        >
          <Suspense
            fallback={
              <div className="world-loading">
                <span className="loading-ball" />
                <span>ASSEMBLING A LITTLE WORLD</span>
              </div>
            }
          >
            <World
              station={station}
              dark={dark}
              onSelect={navigate}
              paused={paused || inCinema}
              onReady={() => setReady(true)}
              onBearingChange={updateBearing}
            />
          </Suspense>
        </div>
        {station === "home" && (
          <div className="home-copy">
            <span className="home-eyebrow">
              <i /> WELCOME TO MY CORNER OF THE INTERNET
            </span>
            <h1 tabIndex={-1}>
              CODE.
              <br />
              CURIOSITY.
              <br />
              <span>
                SIDE QUESTS<span className="title-dot">.</span>
              </span>
            </h1>
            <div className="home-intro">
              <span className="hello-star" aria-hidden="true">
                ✳
              </span>
              <p>
                I’m Aditya, a Computer Science Engineer.
                <br />I build products from the first idea to the latest
                release.
                <br />
              </p>
            </div>
            <p className="home-current">
              <i /> CURRENTLY BUILDING{" "}
              <strong>
                <a
                  href="https://heytheo.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  HEYTHEO
                </a>{" "}
                &{" "}
                <a
                  href="https://vediq.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  VEDIQ
                </a>
              </strong>
            </p>
            <button className="explore-button" onClick={() => navigate("work")}>
              <span>Take a look around</span>
              <Icon name="arrow" />
            </button>
          </div>
        )}
        {station === "home" && (
          <div className="world-invitation">
            <svg
              width="70"
              height="55"
              viewBox="0 0 70 55"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2 43C28 50 42 36 46 8m-12 9L47 5l9 14"
                stroke="currentColor"
                strokeWidth="1.4"
              />
            </svg>
            <span>
              Click a place.
              <br />
              See what’s inside.
            </span>
            <small>
              {ready ? "DRAG TO TURN THE WORLD" : "LOADING THE ISLAND…"}
            </small>
          </div>
        )}
        {station === "food" && (
          <section
            className="food-court-copy route-enter"
            aria-labelledby="food-court-title"
          >
            <p className="food-court-eyebrow">FOOD COURT</p>
            <h1 id="food-court-title" tabIndex={-1}>
              Good food.
              <br />
              <em>Better company.</em>
            </h1>
            <p className="food-court-caption">Pull up a chair.</p>
            <button className="back-world" onClick={() => navigate("home")}>
              <Icon name="arrow-left" size={16} /> BACK TO THE WORLD
            </button>
          </section>
        )}
        {station !== "home" && station !== "anime" && station !== "food" && (
          <section
            className="station-panel route-enter"
            key={station}
            aria-label={places.find((item) => item.id === station)!.name}
          >
            <button className="back-world" onClick={() => navigate("home")}>
              <Icon name="arrow-left" size={16} /> BACK TO THE WORLD
            </button>
            {station === "work" ? (
              <Career />
            ) : station === "education" ? (
              <Education />
            ) : station === "viper" ? (
              <ListeningBar paused={paused} />
            ) : (
              <Contact />
            )}
          </section>
        )}
        {inCinema && (
          <Suspense
            fallback={
              <div className="cinema-loading">THE NEXT WORLD IS LOADING…</div>
            }
          >
            <Cinema paused={paused} />
          </Suspense>
        )}
      </main>
      <footer className="world-footer">
        <Clock />
        <div className="world-passport">
          <span className="passport-dots">
            {places.map((item) => (
              <i
                className={visited.has(item.id) ? "visited" : ""}
                key={item.id}
              />
            ))}
          </span>
          <span>
            {String(visited.size).padStart(2, "0")} /{" "}
            {String(places.length).padStart(2, "0")} PLACES EXPLORED
          </span>
        </div>
        <nav className="world-dock" aria-label="Explore the world">
          {places
            .filter((item) => item.id !== "food")
            .map((item, index) => (
              <button
                key={item.id}
                data-station={item.id}
                onClick={() => navigate(item.id)}
                aria-current={station === item.id ? "page" : undefined}
                aria-label={item.name}
                title={`${item.name} · ${index + 1}`}
              >
                <Icon name={item.id} />
                <span>
                  {
                    [
                      "World",
                      "Experience",
                      "Education",
                      "Music",
                      "Anime",
                      "Hello",
                    ][index]
                  }
                </span>
                <i />
              </button>
            ))}
        </nav>
        <button
          className="motion-toggle"
          onClick={() => setManualPause(!manualPause)}
          disabled={reduced}
          aria-pressed={paused}
          aria-label={
            reduced
              ? "Reduced motion enabled"
              : paused
                ? "Resume animation"
                : "Pause animation"
          }
        >
          <Icon name={paused ? "play" : "pause"} size={16} />
          {reduced ? "REDUCED MOTION" : paused ? "MOTION OFF" : "MOTION ON"}
        </button>
      </footer>
      <dialog
        className="world-map"
        ref={mapRef}
        onCancel={() => setMapOpen(false)}
        onClose={() => setMapOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setMapOpen(false);
        }}
        aria-labelledby="map-title"
      >
        <div className="map-content">
          <div className="map-heading">
            <span className="micro-label">YOUR POCKET GUIDE</span>
            <button
              onClick={() => setMapOpen(false)}
              aria-label="Close world map"
            >
              <Icon name="close" />
            </button>
          </div>
          <h2 id="map-title">Where to?</h2>
          <div className="map-places">
            {places.map((item, index) => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                aria-keyshortcuts={String(index + 1)}
              >
                <span className="map-place-icon">
                  <Icon name={item.id} size={28} />
                </span>
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.hint}</small>
                </span>
                <kbd>{index + 1}</kbd>
              </button>
            ))}
          </div>
          <p>
            Use keys 1–7 to jump between places. Escape closes this guide.
            <br />
            Or click the buildings and see where they take you.
          </p>
        </div>
      </dialog>
    </div>
  );
}
