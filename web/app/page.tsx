'use client';

import Image from "next/image";
import Script from "next/script";
import { useState, useEffect, useRef } from "react";
import styles from "./styles.module.css";
import MapWrapper from "./components/MapWrapper";
import TrainAnimation from "./components/TrainAnimation";

export default function Home() {
  const [selectedLine, setSelectedLine] = useState('all');
  const [startHour, setStartHour] = useState(6);
  const [endHour, setEndHour] = useState(23);
  const [currentHour, setCurrentHour] = useState(6);
  const [isPlaying, setIsPlaying] = useState(false);
  const [metrics, setMetrics] = useState({ totalPax: 0, averagePax: 0, topStations: [] as {name: string, volume: number}[] });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const beepAudioRef = useRef<HTMLAudioElement | null>(null);
  const doorsAudioRef = useRef<HTMLAudioElement | null>(null);
  const metroAudioRef = useRef<HTMLAudioElement | null>(null);
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        beepAudioRef.current = new Audio('/sound/beep.mp3');
        
        doorsAudioRef.current = new Audio('/sound/cierre puertas.wav');
        doorsAudioRef.current.playbackRate = 1.5;
        
        metroAudioRef.current = new Audio('/sound/sonidometro.mp3');
        metroAudioRef.current.volume = 0.2; // softer volume
        metroAudioRef.current.loop = true; // looping
        
        const handleDoorsEnd = () => {
            metroAudioRef.current?.play().catch(e => console.error("Error playing metro sound:", e));
        };
        doorsAudioRef.current.addEventListener('ended', handleDoorsEnd);
        return () => doorsAudioRef.current?.removeEventListener('ended', handleDoorsEnd);
    }
  }, []);

  const playSound = (path: string) => {
    const audio = new Audio(path);
    audio.play().catch(e => console.error("Error playing sound:", e));
  };

  useEffect(() => {
    if (isPlaying) {
      // Start sounds sequence
      beepAudioRef.current?.play().catch(e => console.error(e));
      playTimeoutRef.current = setTimeout(() => {
          doorsAudioRef.current?.play().catch(e => console.error(e));
      }, 500);

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
      // Pause sequence
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
      
      if (beepAudioRef.current) {
          beepAudioRef.current.pause();
          beepAudioRef.current.currentTime = 0;
      }
      if (doorsAudioRef.current) {
          doorsAudioRef.current.pause();
          doorsAudioRef.current.currentTime = 0;
      }
      if (metroAudioRef.current) {
          metroAudioRef.current.pause();
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
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
                  <a href="/" style={{ textDecoration: 'none' }}>
                      <h1 className={styles['project-title']}>Afluencia actual de la red de metro</h1>
                  </a>
              </div>
              
              {/* Animación dinámica de trenes de metro (ahora inicia a la derecha del título) */}
              <div style={{ flex: 1, position: 'relative', height: '100%', overflow: 'hidden', marginLeft: '2rem' }}>
                  <TrainAnimation />
              </div>
          </header>

          {/* 3. Contenedor Principal (Grid/Flex) */}
          <main className={styles['dashboard-main']}>
              
              {/* Panel Izquierdo: Controles y Narrativa (~35%) */}
              <aside className={styles['left-panel']}>
                  
                  {/* Cuadro de contexto/instrucciones */}
                  <section className={`${styles['control-section']} ${styles['context-box']}`}>
                      <h2>Contexto de la Simulación</h2>
                      <p>
                          Esta plataforma visualiza la carga estimada de pasajeros en la red de Metro de Santiago a partir de datos GTFS.
                          A través de esta simulación, puedes observar cómo evoluciona la congestión de la red a lo largo del día y 
                          descubrir los cuellos de botella estación por estación.
                      </p>
                  </section>

                  {/* Menú de selección de línea */}
                  <section className={`${styles['control-section']} ${styles['line-selection']}`}>
                      <h2>Selección de Línea</h2>
                      <select 
                          id="line-selector" 
                          className={styles['styled-select']}
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
                  </section>

                  {/* Selector de Rango de Horas para Simulación */}
                  <section className={`${styles['control-section']} ${styles['time-selection']}`}>
                      <h2>Simulación de Afluencia</h2>
                      
                      {/* Timeline Slider (Controls Current Hour) */}
                      <div style={{ marginBottom: '1.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                              <span>{startHour}:00</span>
                              <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1rem' }}>{currentHour}:00 hrs</span>
                              <span>{endHour}:00</span>
                          </div>
                          <input 
                              type="range" 
                              min={startHour} 
                              max={endHour} 
                              value={currentHour} 
                              onChange={(e) => {
                                  setCurrentHour(parseInt(e.target.value));
                                  setIsPlaying(false);
                              }}
                              style={{ width: '100%', cursor: 'pointer' }}
                          />
                      </div>

                      {/* Interval selection (Bounds) */}
                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', flex: 1 }}>
                              Hora Inicio
                              <select 
                                  value={startHour} 
                                  onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      setStartHour(val);
                                      if (currentHour < val) setCurrentHour(val);
                                  }}
                                  className={styles['styled-select']}
                                  style={{ padding: '0.25rem', marginTop: '0.25rem' }}
                              >
                                  {Array.from({length: 18}, (_, i) => i + 6).filter(h => h < endHour).map(h => (
                                      <option key={h} value={h}>{h}:00</option>
                                  ))}
                              </select>
                          </label>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', flex: 1 }}>
                              Hora Fin
                              <select 
                                  value={endHour} 
                                  onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      setEndHour(val);
                                      if (currentHour > val) setCurrentHour(val);
                                  }}
                                  className={styles['styled-select']}
                                  style={{ padding: '0.25rem', marginTop: '0.25rem' }}
                              >
                                  {Array.from({length: 18}, (_, i) => i + 6).filter(h => h > startHour).map(h => (
                                      <option key={h} value={h}>{h}:00</option>
                                  ))}
                              </select>
                          </label>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button 
                              onClick={() => {
                                  if (!isPlaying && currentHour >= endHour) {
                                      setCurrentHour(startHour);
                                  }
                                  setIsPlaying(!isPlaying);
                              }}
                              style={{
                                  background: isPlaying ? '#ef4444' : '#00934F',
                                  color: 'white',
                                  border: 'none',
                                  padding: '0.5rem 2rem',
                                  borderRadius: '20px',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  transition: 'background 0.3s',
                                  width: '100%'
                              }}
                          >
                              {isPlaying ? '⏸ Pausar Simulación' : '▶ Reproducir Simulación'}
                          </button>
                      </div>
                  </section>

                  {/* Indicadores métricos clave */}
                  <section className={`${styles['control-section']} ${styles.metrics}`}>
                      <h2>Estaciones Más Congestionadas</h2>
                      <div className={styles['metric-cards']}>
                          <div className={styles['metric-card']} style={{ gridColumn: '1 / -1' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {metrics.topStations.map((s, i) => (
                                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '4px', paddingTop: '4px' }}>
                                          <span><strong>{i+1}.</strong> {s.name}</span>
                                      </div>
                                  ))}
                                  {metrics.topStations.length === 0 && <span style={{ padding: '0.5rem 0' }}>Sin datos para esta hora</span>}
                              </span>
                          </div>
                      </div>
                  </section>
              </aside>

              {/* Panel Derecho: Visualización Principal (~65%) */}
              <section className={styles['right-panel']}>
                  {/* Contenedor destacado para la vista InfoVis (D3.js, Canvas, etc.) */}
                  <div className={styles['visualization-container']} id="viz-container">
                      {/* Overlay para la Hora y Tipo de Horario */}
                      <div style={{
                          position: 'absolute',
                          top: '20px',
                          right: '20px',
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          padding: '1rem',
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                          zIndex: 10,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          border: '1px solid #e2e8f0'
                      }}>
                          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>
                              {currentHour}:00 hrs
                          </span>
                          <span style={{
                              marginTop: '0.5rem',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '20px',
                              backgroundColor: `${timeCategory.color}20`,
                              color: timeCategory.color,
                              fontWeight: 'bold',
                              fontSize: '0.85rem',
                              border: `1px solid ${timeCategory.color}`
                          }}>
                              {timeCategory.label}
                          </span>
                      </div>
                      <MapWrapper selectedLine={selectedLine} currentHour={currentHour} onMetricsUpdate={setMetrics} />
                  </div>
              </section>
              
          </main>
      </div>
      
      {/* Librerías y Scripts */}
      <Script src="https://cdn.plot.ly/plotly-2.32.0.min.js" strategy="beforeInteractive" />
      {/* <Script src="/app.js" strategy="lazyOnload" /> */}
    </>
  );
}
