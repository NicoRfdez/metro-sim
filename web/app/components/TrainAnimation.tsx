'use client';

import { useState, useEffect } from 'react';
import styles from '../styles.module.css';

interface TrainInstance {
  id: number;
  color: string;
  cars: number;
  duration: number; // in seconds
}

const TRAIN_COLORS = [
    '#e42228', // L1 Red
    '#FFD200', // L2 Yellow
    '#8C543A', // L3 Brown
    '#002365', // L4 Blue
    '#0087CE', // L4A Light Blue
    '#00934F', // L5 Green
    '#A276B4'  // L6 Purple
];

export default function TrainAnimation() {
  const [trains, setTrains] = useState<TrainInstance[]>([]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const spawnTrain = () => {
      if (!isMounted) return;

      const newTrain: TrainInstance = {
        id: Date.now(),
        color: TRAIN_COLORS[Math.floor(Math.random() * TRAIN_COLORS.length)],
        cars: Math.floor(Math.random() * 4) + 3, // 3 to 6 cars
        duration: Math.floor(Math.random() * 4) + 12, // 12 to 15 seconds to cross screen
      };

      setTrains(prev => [...prev, newTrain]);

      // Remove train after it leaves screen
      setTimeout(() => {
        if (isMounted) {
            setTrains(prev => prev.filter(t => t.id !== newTrain.id));
        }
      }, newTrain.duration * 1000 + 1000);

      // Random delay for the NEXT train: between 10s and 30s
      const nextSpawnDelay = Math.floor(Math.random() * 20000) + 10000;
      timeoutId = setTimeout(spawnTrain, nextSpawnDelay);
    };

    // First train spawns after 2 seconds
    timeoutId = setTimeout(spawnTrain, 2000);

    return () => {
        isMounted = false;
        clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className={styles['train-container']}>
      {trains.map(train => {
        const svgWidth = train.cars * 100 + 20;
        
        return (
            <div 
                key={train.id} 
                className={styles['train-wrapper']} 
                style={{ animationDuration: `${train.duration}s`, width: `${svgWidth}px` }}
            >
                <div className={styles['train']}>
                    <svg viewBox={`0 0 ${svgWidth} 30`} width={svgWidth} height="30" fill="none" stroke="none">
                        {Array.from({ length: train.cars }).map((_, i) => {
                            const isRear = i === 0;
                            const isHead = i === train.cars - 1;
                            const isMiddle = !isRear && !isHead;
                            const xOffset = i * 100;
                            
                            return (
                                <g key={i} transform={`translate(${xOffset}, 0)`}>
                                    {/* Body */}
                                    {isMiddle ? (
                                        <rect x="0" y="5" width="95" height="20" fill="#1e293b" />
                                    ) : isRear ? (
                                        <path d="M 95 5 L 15 5 Q 5 5 5 15 L 5 25 L 95 25 Z" fill="#1e293b" />
                                    ) : (
                                        <path d="M 0 5 L 75 5 Q 85 5 85 15 L 85 25 L 0 25 Z" fill="#1e293b" />
                                    )}

                                    {/* Color Strip */}
                                    {isMiddle ? (
                                        <rect x="0" y="14" width="95" height="4" fill={train.color} />
                                    ) : isRear ? (
                                        <path d="M 95 14 L 10 14 Q 5 14 5 16 L 5 18 L 95 18 Z" fill={train.color} />
                                    ) : (
                                        <path d="M 0 14 L 80 14 Q 85 14 85 16 L 85 18 L 0 18 Z" fill={train.color} />
                                    )}
                                    
                                    {/* Windows */}
                                    {isMiddle ? (
                                        <>
                                            <rect x="15" y="8" width="15" height="5" rx="1" fill="#cbd5e1" />
                                            <rect x="40" y="8" width="15" height="5" rx="1" fill="#cbd5e1" />
                                            <rect x="65" y="8" width="15" height="5" rx="1" fill="#cbd5e1" />
                                        </>
                                    ) : isRear ? (
                                        <>
                                            <rect x="25" y="8" width="15" height="5" rx="1" fill="#cbd5e1" />
                                            <rect x="50" y="8" width="15" height="5" rx="1" fill="#cbd5e1" />
                                            <rect x="75" y="8" width="15" height="5" rx="1" fill="#cbd5e1" />
                                        </>
                                    ) : (
                                        <>
                                            <rect x="5" y="8" width="15" height="5" rx="1" fill="#cbd5e1" />
                                            <rect x="30" y="8" width="15" height="5" rx="1" fill="#cbd5e1" />
                                            <rect x="55" y="8" width="15" height="5" rx="1" fill="#cbd5e1" />
                                        </>
                                    )}

                                    {/* Coupling (union between cars) */}
                                    {!isHead && (
                                        <rect x="95" y="18" width="5" height="3" fill="#64748b" />
                                    )}
                                </g>
                            );
                        })}
                    </svg>
                </div>
                {/* Speed particles attached to this train */}
                <div className={`${styles['particle']} ${styles['p1']}`}></div>
                <div className={`${styles['particle']} ${styles['p2']}`}></div>
                <div className={`${styles['particle']} ${styles['p3']}`}></div>
            </div>
        );
      })}
    </div>
  );
}
