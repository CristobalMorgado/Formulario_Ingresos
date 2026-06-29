# 💰 Wallet.js — Control Financiero Personal

Aplicación web de control de finanzas personales construida con **HTML5**, **CSS3** y **Vanilla JavaScript**. Permite registrar ingresos y egresos por mes, definir saldos iniciales independientes y comparar visualmente los gastos entre meses mediante gráficos de barras horizontales.

> Los datos se guardan automáticamente en el navegador (localStorage).

---

## ✨ Características

- **Registro de transacciones** — Ingresos y egresos organizados por categorías personalizables.
- **Navegación por meses** — Cambia de mes libremente y cada mes mantiene sus propios datos.
- **Saldo inicial por mes** — Cada mes tiene su saldo inicial independiente (no se comparte entre meses).
- **Saldo disponible** — Cálculo automático: `Saldo Inicial + Ingresos − Egresos`.
- **Gráfico de gastos** — Barras horizontales con gradientes que muestran la distribución de egresos.
- **Comparación de meses** — Vista paralela con dos barras delgadas por categoría para comparar visualmente dos meses distintos.
- **Categorías personalizables** — Agrega, edita o elimina categorías tanto de ingresos como de egresos.
- **Persistencia local** — Todos los datos se guardan en `localStorage` del navegador.
- **Diseño premium** — Glassmorphism, gradientes animados, micro-animaciones y tipografía Inter.

---

## 🛠️ Tecnologías

| Tecnología | Uso |
|------------|-----|
| **HTML5** | Estructura semántica con atributos ARIA para accesibilidad |
| **CSS3** | Variables CSS, Grid, Flexbox, gradientes, animaciones con keyframes |
| **Vanilla JS** | Lógica de la app (sin frameworks ni dependencias externas) |
| **Google Fonts** | Tipografía [Inter](https://fonts.google.com/specimen/Inter) |
| **localStorage** | Persistencia de datos en el navegador |

---

## 📁 Estructura del Proyecto

```
Proyecto_Formulario/
├── index.html    → Estructura HTML de la aplicación
├── style.css     → Estilos, diseño responsivo y animaciones
├── app.js        → Lógica completa (estado, render, eventos, storage)
└── README.md     → Este archivo
```

---

## 📝 Registro de Cambios

### 🎨 Icono SVG de Moneda de Dólar

Se reemplazó el icono genérico (círculo + texto `$`) por un **SVG artesanal de moneda** con múltiples capas visuales:

- Sombra exterior para efecto de profundidad.
- Anillo exterior con gradiente de 3 tonos verdes.
- Círculo interior biselado con gradiente diferenciado.
- Anillo decorativo punteado (simula borde dentado de moneda real).
- Brillo superior con elipse translúcida (efecto 3D).
- Signo `$` trazado con `<path>` SVG (curva S + línea vertical), no texto genérico.
- Puntos cardinales decorativos.
- Animación CSS `coinPulse` con brillo pulsante y efecto hover con rotación.

---

### 🐛 Fix: Transacciones se Guardaban Siempre en el Mes Actual

**Problema:** Al navegar a otro mes (ej. Julio) y agregar una transacción, esta se guardaba con la fecha de hoy (`getToday()`), por lo que siempre caía en el mes actual (Junio) sin importar el mes seleccionado.

**Solución:** La fecha de la transacción ahora se construye con `state.selectedMonth + '-15'`, asociando correctamente cada registro al mes que el usuario tiene seleccionado en la interfaz.

```diff
- date: getToday()
+ date: state.selectedMonth + '-15'
```

---

### 🐛 Fix: Saldo Inicial Independiente por Mes

**Problema:** `initialBalance` era un número único global compartido por todos los meses. Al cambiar de mes, el saldo inicial se mantenía igual.

**Solución:** Se reemplazó `initialBalance` (número) por `initialBalances` (objeto/diccionario), donde cada clave es un mes en formato `YYYY-MM`:

```diff
- state.initialBalance = 0;
+ state.initialBalances = {};
```

Incluye **migración automática**: si existían datos con el formato antiguo (número), se convierten al mes actual sin perder información.

---

### 📊 Comparación de Meses con Barras Paralelas

Se rediseñó completamente la sección de comparación de gráficos:

- **Label indicativo** — Se agregó `"Elija el mes a comparar"` en el panel de selección.
- **Panel mejorado** — Fondo con gradiente fuchsia→cyan y borde decorativo.
- **Barras paralelas** — Cada categoría muestra dos barras delgadas horizontales (16px) una debajo de la otra, con su monto al lado, usando CSS Grid.
- **Leyenda mejorada** — Swatches alargados con border-radius, fondo sutil.
- **Animación de entrada** — Las barras aparecen con `barSlideIn` (slide + fade) con delay escalonado.
- **Separadores** — Línea sutil entre categorías en modo comparación.

---

## 🚀 Uso

1. Abre `index.html` en cualquier navegador moderno.
2. Define el **saldo inicial** del mes.
3. Agrega **ingresos** y **egresos** con sus categorías.
4. Navega entre meses con las flechas `‹` `›`.
5. Presiona **🔍 Comparar Meses** para ver gráficos paralelos entre dos meses.

---

## 👤 Autor

**Cristobal Morgado**

---
