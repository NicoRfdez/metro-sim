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
  const beepAudioRef = useRef<HTMLAudioElement | null>(null);
  const doorsAudioRef = useRef<HTMLAudioElement | null>(null);
  const metroAudioRef = useRef<HTMLAudioElement | null>(null);
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        beepAudioRef.current = new Audio(asset('/sound/beep.mp3'));
        
        doorsAudioRef.current = new Audio(asset('/sound/cierre_puertas.wav'));
        doorsAudioRef.current.playbackRate = 1.5;
        
        metroAudioRef.current = new Audio(asset('/sound/sonidometro.mp3'));
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
    const audio = new Audio(asset(path));
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
                  <Link href="/" style={{ textDecoration: 'none' }}>
                      <h1 className={styles['project-title']}>Afluencia actual de la red de metro</h1>
                  </Link>
              </div>
              
              {/* Animación dinámica de trenes de metro (ahora inicia a la derecha del título) */}
              <div style={{ flex: 1, position: 'relative', height: '100%', overflow: 'hidden', marginLeft: '2rem' }}>
                  <TrainAnimation />
              </div>
          </header>

          {/* 3. Plana única (el mapa abarca toda la pantalla sin divisiones) */}
          <main className={styles['dashboard-main']}>
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
                                  if (!isPlaying && currentHour >= endHour) {
                                      setCurrentHour(startHour);
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

              {/* El mapa abarca toda la plana */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                  <MapWrapper selectedLine={selectedLine} currentHour={currentHour} onMetricsUpdate={setMetrics} />
              </div>
          </main>
      </div>
    </>
  );
}
