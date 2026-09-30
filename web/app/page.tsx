import Image from "next/image";
import Script from "next/script";
import styles from "./styles.module.css";

export default function Home() {
  return (
    <>
      {/* Contenedor principal del dashboard (100vh, estático) */}
      <div className={styles['dashboard-container']}>
          
          {/* 2. Encabezado Superior */}
          <header className={styles['dashboard-header']}>
              <div className={styles['header-titles']}>
                  <h1 className={styles['project-title']}>MetroVis Santiago</h1>
                  <span className={styles['project-subtitle']}>Visualización de Flujos y Simulación GTFS</span>
              </div>
              <div className={styles['header-badges']}>
                  <span className={`${styles.badge} ${styles['data-source']}`}>Datos: GTFS Update</span>
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
                          Explora la simulación en tiempo real del flujo de pasajeros y el estado de la red de Metro de Santiago. 
                          Selecciona una línea específica para ver detalles de afluencia o mantén la vista global de la red.
                      </p>
                  </section>

                  {/* Menú de selección de línea */}
                  <section className={`${styles['control-section']} ${styles['line-selection']}`}>
                      <h2>Selección de Línea</h2>
                      <select id="line-selector" className={styles['styled-select']}>
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

                  {/* Indicadores métricos clave */}
                  <section className={`${styles['control-section']} ${styles.metrics}`}>
                      <h2>Métricas en Tiempo Real</h2>
                      <div className={styles['metric-cards']}>
                          <div className={styles['metric-card']}>
                              <span className={styles['metric-label']}>Afluencia Estimada</span>
                              <span className={styles['metric-value']}>45,200 <small>pax/h</small></span>
                          </div>
                          <div className={styles['metric-card']}>
                              <span className={styles['metric-label']}>Estado de Red</span>
                              <span className={`${styles['metric-value']} ${styles['status-ok']}`}>Operativa</span>
                          </div>
                          <div className={styles['metric-card']}>
                              <span className={styles['metric-label']}>Trenes Activos</span>
                              <span className={styles['metric-value']}>114</span>
                          </div>
                      </div>
                  </section>
              </aside>

              {/* Panel Derecho: Visualización Principal (~65%) */}
              <section className={styles['right-panel']}>
                  {/* Contenedor destacado para la vista InfoVis (D3.js, Canvas, etc.) */}
                  <div className={styles['visualization-container']} id="viz-container">
                      
                      {/* Placeholder visual mientras no haya renderizado de datos */}
                      <div className={styles['viz-placeholder']}>
                          <div className={styles['viz-icon']}>🚇</div>
                          <p>Área de Visualización Principal</p>
                          <span>(Aquí se renderizará el mapa topológico / diagrama de flujo de la línea seleccionada)</span>
                      </div>

                  </div>
              </section>
              
          </main>
      </div>
      
      {/* Librerías y Scripts */}
      <Script src="https://cdn.plot.ly/plotly-2.32.0.min.js" strategy="lazyOnload" />
      {/* <Script src="/app.js" strategy="lazyOnload" /> */}
    </>
  );
}
