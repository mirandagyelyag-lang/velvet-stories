export default function NativeButterflyLaunch() {
  const stars = Array.from({ length: 18 }, (_, index) => index);
  const dots = Array.from({ length: 9 }, (_, index) => index);

  return (
    <main className="app-loading app-loading--native app-loading--butterfly" aria-label="Velvet Stories is starting">
      <div className="velvet-launch__fold velvet-launch__fold--one" aria-hidden="true" />
      <div className="velvet-launch__fold velvet-launch__fold--two" aria-hidden="true" />
      <div className="velvet-launch__fold velvet-launch__fold--three" aria-hidden="true" />

      <div className="velvet-launch__stars" aria-hidden="true">
        {stars.map((star) => (
          <i
            key={star}
            style={{
              "--star-x": `${(star * 47 + 13) % 94}%`,
              "--star-y": `${(star * 67 + 9) % 83}%`,
              "--star-size": `${2 + (star % 3)}px`,
              "--star-delay": `${star * -83}ms`,
            }}
          />
        ))}
      </div>

      <div className="velvet-launch__butterfly-flight" aria-hidden="true">
        <svg className="velvet-launch__butterfly" viewBox="0 0 260 220" role="presentation">
          <defs>
            <linearGradient id="velvetButterflyWing" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff0f8" />
              <stop offset="0.22" stopColor="#ff8fca" />
              <stop offset="0.58" stopColor="#d33587" />
              <stop offset="1" stopColor="#70153f" />
            </linearGradient>
            <linearGradient id="velvetButterflyBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff7fb" />
              <stop offset="0.45" stopColor="#ff9dce" />
              <stop offset="1" stopColor="#b72e70" />
            </linearGradient>
            <radialGradient id="velvetButterflyInner" cx="50%" cy="45%" r="65%">
              <stop offset="0" stopColor="#ffbddd" stopOpacity="0.64" />
              <stop offset="0.45" stopColor="#ce397f" stopOpacity="0.34" />
              <stop offset="1" stopColor="#471024" stopOpacity="0.08" />
            </radialGradient>
          </defs>

          <g className="velvet-launch__wing velvet-launch__wing--left">
            <path d="M123 111C98 78 55 22 21 39C-2 50 13 89 50 111C72 124 101 126 123 111Z" fill="url(#velvetButterflyInner)" stroke="url(#velvetButterflyWing)" strokeWidth="3.5" />
            <path d="M121 115C90 118 43 123 37 150C31 177 67 193 94 170C108 158 117 136 121 115Z" fill="url(#velvetButterflyInner)" stroke="url(#velvetButterflyWing)" strokeWidth="3.2" />
            <path d="M112 105C88 83 62 60 37 55M112 111C80 102 54 90 29 75M111 119C82 128 61 145 50 162M116 122C96 145 89 158 88 174" fill="none" stroke="#ffb8da" strokeOpacity="0.64" strokeWidth="2" strokeLinecap="round" />
            <path d="M101 95C83 73 61 59 48 57M103 102C76 94 58 83 46 72M102 124C78 134 67 146 61 157" fill="none" stroke="#ff5ca9" strokeOpacity="0.5" strokeWidth="1.4" />
          </g>

          <g className="velvet-launch__wing velvet-launch__wing--right">
            <path d="M137 111C162 78 205 22 239 39C262 50 247 89 210 111C188 124 159 126 137 111Z" fill="url(#velvetButterflyInner)" stroke="url(#velvetButterflyWing)" strokeWidth="3.5" />
            <path d="M139 115C170 118 217 123 223 150C229 177 193 193 166 170C152 158 143 136 139 115Z" fill="url(#velvetButterflyInner)" stroke="url(#velvetButterflyWing)" strokeWidth="3.2" />
            <path d="M148 105C172 83 198 60 223 55M148 111C180 102 206 90 231 75M149 119C178 128 199 145 210 162M144 122C164 145 171 158 172 174" fill="none" stroke="#ffb8da" strokeOpacity="0.64" strokeWidth="2" strokeLinecap="round" />
            <path d="M159 95C177 73 199 59 212 57M157 102C184 94 202 83 214 72M158 124C182 134 193 146 199 157" fill="none" stroke="#ff5ca9" strokeOpacity="0.5" strokeWidth="1.4" />
          </g>

          <path d="M130 79C122 91 122 121 130 157C138 121 138 91 130 79Z" fill="url(#velvetButterflyBody)" />
          <circle cx="130" cy="79" r="6" fill="#ffd6ea" />
          <path d="M127 76C119 60 110 55 104 56M133 76C141 60 150 55 156 56" fill="none" stroke="#ffacd3" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="103" cy="56" r="2.4" fill="#ffb9da" />
          <circle cx="157" cy="56" r="2.4" fill="#ffb9da" />
        </svg>
        <div className="velvet-launch__trail" />
      </div>

      <section className="velvet-launch__brand" aria-hidden="true">
        <strong>VELVET</strong>
        <span>STORIES</span>
      </section>

      <div className="velvet-launch__loading-copy">
        <p>Entrando a tu historia...</p>
        <div className="velvet-launch__dots" aria-hidden="true">
          {dots.map((dot) => <i key={dot} style={{ "--dot-delay": `${dot * 95}ms` }} />)}
        </div>
      </div>
    </main>
  );
}
