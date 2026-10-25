import Icon from "../ui/Icon";
import "./cassette-deck.css";

type CassetteDeckProps = {
  playing: boolean;
  paused: boolean;
  tone: number;
  onToggle: () => void;
  onToneChange: (value: number) => void;
};

export default function CassetteDeck({
  playing,
  paused,
  tone,
  onToggle,
  onToneChange,
}: CassetteDeckProps) {
  return (
    <div
      className={`cassette-deck${playing ? " is-playing" : ""}${playing && !paused ? " is-running" : ""}`}
    >
      <div className="cassette-deck__header">
        <span>STEREO / CASSETTE</span>
        <span className="cassette-deck__status">
          <i aria-hidden="true" />
          {playing ? "PLAYING" : "STANDBY"}
        </span>
      </div>

      <div className="cassette-deck__body" aria-hidden="true">
        <div className="cassette-deck__door">
          <div className="cassette-tape">
            <i className="cassette-tape__screw cassette-tape__screw--tl" />
            <i className="cassette-tape__screw cassette-tape__screw--tr" />
            <i className="cassette-tape__screw cassette-tape__screw--bl" />
            <i className="cassette-tape__screw cassette-tape__screw--br" />
            <div className="cassette-tape__label">
              <span className="cassette-tape__side">A</span>
              <span className="cassette-tape__title">syntaxticsugr</span>
              <span className="cassette-tape__subtitle">
                a little sound study
              </span>
            </div>
            <div className="cassette-tape__window">
              <div className="cassette-tape__spool cassette-tape__spool--left">
                <div className="cassette-tape__hub">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <div className="cassette-tape__bridge">
                <i />
              </div>
              <div className="cassette-tape__spool cassette-tape__spool--right">
                <div className="cassette-tape__hub">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </div>
            <div className="cassette-tape__foot">
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
        <div className="cassette-deck__speaker" />
      </div>

      <div className="cassette-deck__controls">
        <button
          className="cassette-deck__transport"
          onClick={onToggle}
          aria-pressed={playing}
          aria-label={playing ? "Pause sound" : "Play sound"}
        >
          <Icon name={playing ? "pause" : "play"} size={19} />
          <span>{playing ? "PAUSE" : "PLAY"}</span>
        </button>
        <div className="cassette-deck__tone">
          <label htmlFor="tone">
            Warm <span>Bright</span>
          </label>
          <div className="cassette-deck__fader">
            <input
              id="tone"
              type="range"
              min="0"
              max="100"
              value={tone}
              onChange={(event) => onToneChange(Number(event.target.value))}
              aria-label="Sound brightness"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
