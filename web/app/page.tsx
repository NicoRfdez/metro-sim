'use client';

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import styles from "./styles.module.css";
import MapWrapper from "./components/MapWrapper";
import TrainAnimation from "./components/TrainAnimation";
import type { MapMetrics } from "./components/MetroMap";
import { asset } from "./lib/paths";

export default function Home() {
  const [selectedLine, setSelectedLine] = useState('all');
  const [startHour, setStartHour] = useState(6);
  const [endHour, setEndHour] = useState(23);
  const [currentHour, setCurrentHour] = useState(6);
  const [isPlaying, setIsPlaying] = useState(false);
  const [, setMetrics] = useState<MapMetrics>({ totalPax: 0, averagePax: 0, topStations: [] });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const playStartAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      playStartAudioRef.current = new Audio(asset('/sound/play_start.wav'));
      playStartAudioRef.current.volume = 0.6;
    }
  }, []);

  const playSound = (path: string) => {
    const audio = new Audio(asset(path));
    audio.play().catch(e => console.error("Error playing sound:", e));
  };

  useEffect(() => {
    if (isPlaying) {
      // Start tick
      intervalRef.current = setInterval(() => {
        setCurrentHour((prev) => {
          if (prev >= endHour) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, endHour]);
  const timeCategory = (() => {
    const h = currentHour;
    if ((h >= 7 && h <= 8) || (h >= 18 && h <= 19)) return { label: 'Horario Punta', color: '#ef4444' };
    if ((h >= 9 && h <= 17) || h === 20) return { label: 'Horario Valle', color: '#22c55e' };
    return { label: 'Horario Bajo', color: '#3b82f6' };
  })();

  return (
    <>
      {/* Contenedor principal del dashboard (100vh, estático) */}
      <div className={styles['dashboard-container']}>
          {/* 2. Encabezado Superior */}
          <header className={styles['dashboard-header']}>
              <div className={styles['header-titles']}>
                  <Link href="/" style={{ textDecoration: 'none' }}>
                      <h1 className={styles['project-title']}>MetroVis</h1>
                  </Link>
              </div>
              
              {/* Animación dinámica de trenes de metro (ahora inicia a la derecha del título) */}
              <div style={{ flex: 1, position: 'relative', height: '100%', overflow: 'hidden', marginLeft: '2rem' }}>
                  <TrainAnimation />
              </div>
          </header>

          {/* 3. Sección Informativa al comienzo de la página */}
          <section className={styles['info-section']} id="info-section">
              <div className={styles['info-container']}>
                  <h2 className={styles['info-title']}>Nivel de afluencia en el metro</h2>
                  <p className={styles['info-subtitle']}>
                      Plataforma interactiva diseñada para la visualización, simulación y comprensión 
                      de la distribución de pasajeros en la red de Metro de Santiago a lo largo del día.
                  </p>

                  <div className={styles['info-grid']}>
                      {/* Tarjeta 1: ¿De qué trata? */}
                      <div className={styles['info-card']}>
                          <div className={styles['info-card-header']}>
                              <span className={styles['info-card-icon']}>🚇</span>
                              <h3 className={styles['info-card-title']}>¿De qué trata MetroVis?</h3>
                          </div>
                          <p className={styles['info-card-text']}>
                              MetroVis es un simulador analítico que traduce registros reales de transporte en una 
                              representación visual intuitiva. Permite explorar las 7 líneas operativas del Metro de Santiago 
                              (L1, L2, L3, L4, L4A, L5 y L6), examinando la concentración de personas y cuellos de botella 
                              estación por estación.
                          </p>
                      </div>

                      {/* Tarjeta 2: Escala Cromática */}
                      <div className={styles['info-card']}>
                          <div className={styles['info-card-header']}>
                              <span className={styles['info-card-icon']}>🎨</span>
                              <h3 className={styles['info-card-title']}>Escala de Afluencia</h3>
                          </div>
                          <p className={styles['info-card-text']}>
                              El volumen de usuarios por hora se representa visualmente con un gradiente cromático accesible:
                          </p>
                          <div className={styles['scale-legend-container']}>
                              <div className={styles['scale-legend-item']}>
                                  <span className={styles['scale-dot']} style={{ backgroundColor: '#22c55e' }} />
                                  <span><strong>Afluencia Baja (&lt; 500 pax):</strong> Flujo expedito y andenes despejados.</span>
                              </div>
                              <div className={styles['scale-legend-item']}>
                                  <span className={styles['scale-dot']} style={{ backgroundColor: '#eab308' }} />
                                  <span><strong>Afluencia Media (500 – 1.500 pax):</strong> Flujo regular de horarios intermedios.</span>
                              </div>
                              <div className={styles['scale-legend-item']}>
                                  <span className={styles['scale-dot']} style={{ backgroundColor: '#ef4444' }} />
                                  <span><strong>Afluencia Alta (&gt; 1.500 pax):</strong> Puntos críticos y alta congestión.</span>
                              </div>
                          </div>
                      </div>

                      {/* Tarjeta 3: Horarios y Dinámica */}
                      <div className={styles['info-card']}>
                          <div className={styles['info-card-header']}>
                              <span className={styles['info-card-icon']}>⏱️</span>
                              <h3 className={styles['info-card-title']}>Dinámica Horaria</h3>
                          </div>
                          <p className={styles['info-card-text']}>
                              La simulación abarca de 06:00 a 23:00 hrs, reflejando las tres fases de la operación diaria:
                          </p>
                          <ul style={{ fontSize: '0.88rem', color: '#cbd5e1', paddingLeft: '1.2rem', lineHeight: '1.65', marginTop: '0.35rem' }}>
                              <li><strong style={{ color: '#ef4444' }}>Horario Punta:</strong> 07:00-08:59 y 18:00-19:59 hrs (máxima demanda laboral).</li>
                              <li><strong style={{ color: '#22c55e' }}>Horario Valle:</strong> 09:00-17:59 y 20:00-20:59 hrs (circulación fluida).</li>
                              <li><strong style={{ color: '#3b82f6' }}>Horario Bajo:</strong> 06:00-06:59 y 21:00-23:00 hrs (apertura y cierre).</li>
                          </ul>
                      </div>
                  </div>

                  {/* Botón para saltar al mapa interactivo */}
                  <button 
                      onClick={() => {
                          document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={styles['scroll-indicator-bar']}
                      style={{ position: 'relative', bottom: 'auto', left: 'auto', transform: 'none', margin: '0 auto', padding: '0.65rem 1.75rem', fontSize: '0.88rem' }}
                      title="Explorar el mapa y simulación"
                  >
                      <span>Explorar mapa y simulación</span>
                      <span style={{ fontSize: '1rem' }}>↓</span>
                  </button>
              </div>
          </section>

          {/* 4. Mapa Interactivo y Simulación al final de la página */}
          <main className={styles['dashboard-main']} id="map-section">
              {/* Selector de línea flotante arriba centrado */}
              <div className={styles['top-line-selector']}>
                  <span className={styles['top-line-label']}>Línea:</span>
                  <select 
                      id="line-selector" 
                      className={styles['styled-select-compact']}
                      value={selectedLine}
                      onChange={(e) => {
                          setSelectedLine(e.target.value);
                          playSound('/sound/cambio_de_linea.wav');
                      }}
                  >
                      <option value="all">Toda la Red</option>
                      <option value="L1">Línea 1 (San Pablo - Los Dominicos)</option>
                      <option value="L2">Línea 2 (Vespucio Norte - Hospital El Pino)</option>
                      <option value="L3">Línea 3 (Quilicura - F. Castillo Velasco)</option>
                      <option value="L4">Línea 4 (Tobalaba - Plaza de Puente Alto)</option>
                      <option value="L4A">Línea 4A (Vicuña Mackenna - La Cisterna)</option>
                      <option value="L5">Línea 5 (Plaza de Maipú - Vicente Valdés)</option>
                      <option value="L6">Línea 6 (Cerrillos - Los Leones)</option>
                  </select>
              </div>

              {/* Simulación minimalista abajo a la izquierda */}
              <div className={styles['minimal-sim-card']}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <button 
                              onClick={() => {
                                  if (!isPlaying) {
                                      if (currentHour >= endHour) {
                                          setCurrentHour(startHour);
                                      }
                                      if (playStartAudioRef.current) {
                                          playStartAudioRef.current.currentTime = 0;
                                          playStartAudioRef.current.play().catch(e => console.error(e));
                                      }
                                  }
                                  setIsPlaying(!isPlaying);
                              }}
                              className={styles['minimal-play-btn']}
                              style={{ background: isPlaying ? '#ef4444' : '#00934F' }}
                              title={isPlaying ? 'Pausar Simulación' : 'Reproducir Simulación'}
                          >
                              {isPlaying ? '⏸' : '▶'}
                          </button>
                          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                              {currentHour}:00 hrs
                          </span>
                      </div>
                      <span style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          backgroundColor: `${timeCategory.color}25`,
                          color: timeCategory.color,
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          border: `1px solid ${timeCategory.color}`
                      }}>
                          {timeCategory.label}
                      </span>
                  </div>

                  {/* Timeline Slider minimalista */}
                  <div>
                      <input 
                          type="range" 
                          min={startHour} 
                          max={endHour} 
                          value={currentHour} 
                          onChange={(e) => {
                              setCurrentHour(parseInt(e.target.value));
                              setIsPlaying(false);
                          }}
                          className={styles['minimal-slider']}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.7rem', marginTop: '3px' }}>
                          <span>{startHour}:00</span>
                          <span>{endHour}:00</span>
                      </div>
                  </div>

                  {/* Rango de horas compacto */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.45rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      <span>Rango:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <select 
                              value={startHour} 
                              onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  setStartHour(val);
                                  if (currentHour < val) setCurrentHour(val);
                              }}
                              className={styles['mini-select']}
                          >
                              {Array.from({length: 18}, (_, i) => i + 6).filter(h => h < endHour).map(h => (
                                  <option key={h} value={h}>{h}:00</option>
                              ))}
                          </select>
                          <span>a</span>
                          <select 
                              value={endHour} 
                              onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  setEndHour(val);
                                  if (currentHour > val) setCurrentHour(val);
                              }}
                              className={styles['mini-select']}
                          >
                              {Array.from({length: 18}, (_, i) => i + 6).filter(h => h > startHour).map(h => (
                                  <option key={h} value={h}>{h}:00</option>
                              ))}
                          </select>
                      </div>
                  </div>
              </div>

              {/* Botón flotante para volver arriba a la información */}
              <button 
                  onClick={() => {
                      document.getElementById('info-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={styles['scroll-indicator-bar']}
                  title="Volver a la información"
              >
                  <span style={{ fontSize: '0.85rem' }}>↑</span>
                  <span>Ver información</span>
              </button>

              {/* El mapa abarca toda la plana */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                  <MapWrapper selectedLine={selectedLine} currentHour={currentHour} onMetricsUpdate={setMetrics} />
              </div>
          </main>

          {/* 5. Pie de Página (Footer) */}
          <footer className={styles['dashboard-footer']}>
              <div className={styles['footer-content']}>
                  <p className={styles['footer-disclaimer']}>
                      <strong>Aviso:</strong> Este proyecto es independiente y <strong>no forma parte ni tiene afiliación oficial con la empresa Metro de Santiago</strong>. 
                      Fue desarrollado únicamente con fines académicos y de visualización a partir de datos públicos otorgados por el{' '}
                      <strong>DTPM (Directorio de Transporte Público Metropolitano)</strong>.
                  </p>
                  <a
                      href="https://github.com/NicoRfdez/metro-sim"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles['footer-repo-link']}
                      title="Ver repositorio en GitHub"
                  >
                      <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                      >
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                      <span>Repositorio en GitHub</span>
                  </a>
              </div>
          </footer>
      </div>
    </>
  );
}
