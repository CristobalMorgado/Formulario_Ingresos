# Billetera.JS — Control Financiero Personal (Full-Stack)

Aplicación web de control de finanzas personales construida con **HTML5**, **CSS3**, **Vanilla JavaScript** en el frontend, y **Node.js + Express + MongoDB Atlas** en el backend. 
Permite registrar ingresos y egresos por mes, definir saldos iniciales independientes y mantener todos los datos sincronizados en tiempo real en una base de datos en la nube.

---

## 🌟 Características

- **Arquitectura Full-Stack** — Frontend desacoplado de un backend RESTful en Node.js, conectado a MongoDB.
- **Registro de transacciones unificado** — Ingresos y egresos se manejan bajo el mismo modelo en la base de datos para consultas eficientes.
- **Navegación por meses** — Cambia de mes libremente y cada mes mantiene sus propios datos.
- **Saldo inicial por mes** — Cada mes tiene su saldo inicial independiente guardado en la base de datos.
- **Gráfico de gastos** — Barras horizontales con gradientes que muestran la distribución de egresos.
- **Comparación de meses** — Vista paralela con dos barras delgadas por categoría para comparar visualmente dos meses distintos.
- **Categorías personalizables** — Agrega, edita o elimina categorías. Los cambios se reflejan automáticamente en las transacciones asociadas.
- **Indicadores Económicos** — Integración con la API de `mindicador.cl` para mostrar valor diario del Dólar, UF, Euro, etc.
- **Diseño premium** — Glassmorphism, gradientes animados, micro-animaciones y tipografía Inter.

---

## 🚀 Tecnologías

| Tecnología | Uso |
|------------|-----|
| **HTML5 / CSS3** | Estructura semántica, Variables CSS, Grid, Flexbox, gradientes, animaciones. |
| **Vanilla JS** | Lógica del cliente interactuando con el backend mediante `fetch`. |
| **Node.js + Express** | Servidor backend que expone una API REST y sirve los archivos estáticos del frontend. |
| **MongoDB Atlas** | Base de datos NoSQL en la nube para almacenamiento persistente. |
| **Mongoose** | ODM para modelar los datos (Transacciones, Categorías, Saldos). |

---

## 📁 Estructura del Proyecto

```
EVA 2/
├── backend-ingresos/       → Servidor Node.js
│   ├── models/             → Esquemas de Mongoose (Transaccion, Categoria, SaldoInicial)
│   ├── index.js            → Archivo principal del servidor y endpoints de la API
│   ├── package.json        → Dependencias del backend
│   └── .env                → Variables de entorno (URI de MongoDB)
│
└── Proyecto_Formulario/    → Interfaz de usuario (Frontend)
    ├── index.html          → Estructura HTML
    ├── style.css           → Estilos y animaciones
    ├── app.js              → Lógica de cliente y llamadas a la API
    └── README.md           → Este archivo
```

---

## ⚙️ Uso Local

1. Abre una terminal en la carpeta `backend-ingresos`.
2. Instala las dependencias: `npm install`
3. Inicia el servidor: `node index.js`
4. Abre tu navegador e ingresa a `http://localhost:3000`. (El servidor de Node.js entregará automáticamente la aplicación web).

---

## ☁️ Roadmap: Despliegue y Autenticación

Para que esta aplicación pueda ser utilizada desde cualquier teléfono móvil en cualquier parte del mundo:

1. **Alojamiento (Hosting):** Se debe desplegar el servidor backend (Node.js) en plataformas como **Render**, **Railway** o **Heroku**.
2. **Autenticación (Futuro):** Actualmente la base de datos es única. Para soportar múltiples usuarios, se deberá:
   - Crear un modelo de `Usuario` en MongoDB.
   - Modificar las transacciones para que incluyan el `usuario_id`.
   - Implementar JSON Web Tokens (JWT) para que cada usuario inicie sesión y solo vea sus propios datos.

---

## 👨‍💻 Autor

**Cristóbal Morgado**
