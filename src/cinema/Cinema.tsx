import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { asset, counts, featuredAnime, watchlist } from "../data";
import Icon from "../ui/Icon";
import "./cinema.css";

type Filter = "all" | "completed" | "ongoing";
const normalize = (value: string) =>
  value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const wrap = (value: number) =>
  (value + featuredAnime.length) % featuredAnime.length;

export default function Cinema({ paused }: { paused: boolean }) {
  const [selected, setSelected] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{ x: number; y: number; pointer: number } | null>(
    null,
  );
  const lastSwipe = useRef(0);
  const film = featuredAnime[selected];
  const entry = watchlist.find((item) => item.id === film.id)!;
  const changeFilm = (direction: number) =>
    setSelected((current) => wrap(current + direction));
  const results = useMemo(() => {
    const term = normalize(query);
    return watchlist.filter((item) => {
      const curated = featuredAnime.find(
        (candidate) => candidate.id === item.id,
      );
      const searchable = normalize(`${item.title} ${curated?.title ?? ""}`);
      return (
        (filter === "all" || item.status === filter) &&
        (!term || searchable.includes(term))
      );
    });
  }, [filter, query]);

  useEffect(() => {
    if (archiveOpen && !dialogRef.current?.open) {
      dialogRef.current?.showModal();
      searchRef.current?.focus();
    }
  }, [archiveOpen]);

  function controlsKeys(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      changeFilm(event.key === "ArrowRight" ? 1 : -1);
    }
  }

  function dragStart(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.isPrimary === false) return;
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointer: event.pointerId,
    };
  }

  function dragMove(event: PointerEvent<HTMLDivElement>) {
    const start = dragRef.current;
    if (
      start &&
      Math.abs(event.clientX - start.x) > 8 &&
      !event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function dragEnd(event: PointerEvent<HTMLDivElement>) {
    const start = dragRef.current;
    dragRef.current = null;
    if (!start || start.pointer !== event.pointerId) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) {
      lastSwipe.current = Date.now();
      changeFilm(deltaX < 0 ? 1 : -1);
    }
  }

  function closeArchive() {
    dialogRef.current?.close();
  }

  function archiveKeys(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeArchive();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input, [href], [tabindex="0"]',
      ),
    );
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <section
      className={`cinema-scene${paused ? " cinema-paused" : ""}`}
      aria-label="Anime"
      style={{ "--cinema-film-color": film.color } as CSSProperties}
    >
      <div className="cinema-atmosphere" aria-hidden="true">
        <div className="cinema-projector" />
        <div className="cinema-orbit cinema-orbit-one" />
        <div className="cinema-orbit cinema-orbit-two" />
        <span className="cinema-watermark">ANIME.</span>
      </div>
      <div className="cinema-scene-label">
        <span>
          <i /> ANIME
        </span>
        <span>SCREEN 02 / ANIME</span>
      </div>

      <div className="cinema-main">
        <div className="cinema-copy">
          <div className="cinema-eyebrow">
            <span className="cinema-fraction">
              {String(selected + 1).padStart(2, "0")}
              <small> / 06</small>
            </span>
            <span>SIX FROM THE WATCHLIST</span>
          </div>
          <div
            className="cinema-film-copy"
            aria-live="polite"
            aria-atomic="true"
          >
            <h1 ref={titleRef} tabIndex={-1} key={film.title}>
              {film.title}
              <span className="cinema-title-period">.</span>
            </h1>
            <p className="cinema-tag">{film.tag}</p>
            <div className="cinema-film-status">
              <span
                className={
                  entry.status === "completed"
                    ? "cinema-complete"
                    : "cinema-ongoing"
                }
              >
                <i />
                {entry.status === "completed" ? "COMPLETED" : "ONGOING"}
              </span>
              {entry.progress && <span>SEASON / {entry.progress}</span>}
            </div>
          </div>
          <div className="cinema-actions" onKeyDown={controlsKeys}>
            <div className="cinema-arrows">
              <button
                type="button"
                className="cinema-arrow"
                onClick={() => changeFilm(-1)}
                aria-label="Previous anime"
              >
                <Icon name="arrow-left" />
              </button>
              <button
                type="button"
                className="cinema-arrow"
                onClick={() => changeFilm(1)}
                aria-label="Next anime"
              >
                <Icon name="arrow" />
              </button>
            </div>
            <button
              type="button"
              className="cinema-shuffle"
              onClick={() =>
                changeFilm(
                  1 + Math.floor(Math.random() * (featuredAnime.length - 1)),
                )
              }
            >
              <Icon name="shuffle" size={18} />
              SHUFFLE THE REEL
            </button>
          </div>
        </div>

        <div
          className="cinema-projection"
          role="group"
          aria-roledescription="carousel"
          aria-label="Anime cover carousel"
          onKeyDown={controlsKeys}
        >
          <div className="cinema-film-perforation" aria-hidden="true" />
          <span className="cinema-projection-label" aria-hidden="true">
            PICTURES THAT STAY WITH YOU
          </span>
          <div
            className="cinema-deck"
            onPointerDown={dragStart}
            onPointerMove={dragMove}
            onPointerUp={dragEnd}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
          >
            {featuredAnime.map((item, index) => {
              let distance = wrap(index - selected);
              if (distance > featuredAnime.length / 2)
                distance -= featuredAnime.length;
              const active = distance === 0;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`cinema-poster${active ? " cinema-poster-active" : ""}${Math.abs(distance) === 3 ? " cinema-poster-away" : ""}`}
                  style={
                    {
                      "--cinema-distance": distance,
                      "--cinema-depth": Math.abs(distance),
                      "--cinema-poster-color": item.color,
                      zIndex: 10 - Math.abs(distance),
                    } as CSSProperties
                  }
                  aria-label={`View ${item.title}`}
                  aria-pressed={active}
                  tabIndex={active ? 0 : -1}
                  onClick={() => {
                    if (Date.now() - lastSwipe.current > 300)
                      setSelected(index);
                  }}
                >
                  <img
                    src={asset(`anime/${item.image}`)}
                    alt={`${item.title} cover`}
                    draggable={false}
                  />
                  <span className="cinema-poster-frame" aria-hidden="true">
                    <span>ANIME</span>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="cinema-drag-hint">
            <Icon name="arrow-left" size={18} /> DRAG TO CHANGE THE SCENE{" "}
            <Icon name="arrow" size={18} />
          </div>
        </div>
      </div>

      <div className="cinema-bottom">
        <div
          className="cinema-selector-group"
          role="group"
          aria-label="Choose an anime"
          onKeyDown={controlsKeys}
        >
          {featuredAnime.map((item, index) => (
            <button
              type="button"
              className={`cinema-selector${index === selected ? " cinema-selector-active" : ""}`}
              key={item.id}
              aria-label={`Select ${item.title}`}
              aria-pressed={index === selected}
              onClick={() => setSelected(index)}
            >
              <span className="cinema-selector-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <img
                src={asset(`anime/${item.image}`)}
                alt=""
                draggable={false}
              />
              <span className="cinema-selector-line" />
            </button>
          ))}
        </div>
        <button
          ref={openerRef}
          type="button"
          className="cinema-archive-open"
          onClick={() => setArchiveOpen(true)}
        >
          <span>
            THE FULL WATCHLIST<small>All {counts.total} entries</small>
          </span>
          <span className="cinema-archive-arrow">
            <Icon name="arrow" />
          </span>
        </button>
      </div>

      <dialog
        ref={dialogRef}
        className="cinema-archive"
        aria-labelledby="cinema-archive-title"
        onKeyDown={archiveKeys}
        onClose={() => {
          setArchiveOpen(false);
          openerRef.current?.focus();
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            closeArchive();
        }}
      >
        <div className="cinema-archive-top">
          <div>
            <p>ANIME / THE ARCHIVE</p>
            <h2 id="cinema-archive-title">
              The watchlist<span>.</span>
            </h2>
          </div>
          <button
            type="button"
            className="cinema-archive-close"
            onClick={closeArchive}
            aria-label="Close watchlist"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="cinema-archive-search">
          <Icon name="search" size={18} />
          <input
            ref={searchRef}
            type="search"
            aria-label="Search watchlist"
            placeholder="Find a title…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div
          className="cinema-archive-filters"
          role="group"
          aria-label="Filter watchlist"
        >
          {(["all", "completed", "ongoing"] as const).map((value) => (
            <button
              type="button"
              key={value}
              className={filter === value ? "cinema-filter-active" : ""}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value === "all"
                ? "All"
                : value === "completed"
                  ? "Completed"
                  : "Ongoing"}
              <span>{value === "all" ? counts.total : counts[value]}</span>
            </button>
          ))}
        </div>
        <div
          className="cinema-archive-list"
          tabIndex={0}
          aria-label="Watchlist results"
        >
          <p className="cinema-result-count" role="status">
            {results.length} {results.length === 1 ? "entry" : "entries"}
            {query ? ` matching “${query}”` : ""}
          </p>
          {results.length ? (
            <ul>
              {results.map((item) => (
                <li key={item.id}>
                  <span className="cinema-entry-number">
                    {String(item.id).padStart(3, "0")}
                  </span>
                  <span className="cinema-entry-title">{item.title}</span>
                  <span
                    className={`cinema-entry-status cinema-entry-${item.status}`}
                  >
                    {item.status === "completed" ? "Completed" : "Ongoing"}
                    {item.progress && <small>Season: {item.progress}</small>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="cinema-empty">
              No titles here. Try another search or filter.
            </p>
          )}
        </div>
        <p className="cinema-archive-foot">
          Personal watchlist · {counts.completed} completed / {counts.ongoing}{" "}
          ongoing<span>ESC TO CLOSE</span>
        </p>
      </dialog>
    </section>
  );
}
