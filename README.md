# 💳 Billetera.JS — Control Financiero Personal (Full-Stack Multi-Usuario)

![Billetera.JS](wallet-icon.png)

Aplicación web Full-Stack de control de finanzas personales desplegada en producción. Construida con **HTML5**, **CSS3**, **Vanilla JavaScript** en el frontend, y **Node.js + Express + MongoDB Atlas** en el backend.

🌐 **Sitio Web en Vivo**: [https://billetera-js.onrender.com/](https://billetera-js.onrender.com/)

---

## ✨ Características Principales

- 🔐 **Sistema de Usuarios y Autenticación JWT**:
  - Registro de cuenta e inicio de sesión seguro con contraseñas encriptadas mediante `bcryptjs`.
  - Tokens de sesión JSON Web Token (JWT) almacenados en `localStorage` con expiración de 7 días.
  - Aislamiento estricto de datos: cada usuario interactúa únicamente con su propia información (`usuarioId`).

- 👑 **Panel de Administración (Admin Portal)**:
  - Rol de Administrador asignado automáticamente a la cuenta principal (`cristobal_fear20@live.cl`).
  - Botón interactivo **`👥 Usuarios`** exclusivo en el header.
  - Tabla de gestión que permite ver usuarios registrados, sus fechas de ingreso, cantidad de transacciones creadas y eliminar cuentas con limpieza en cascada de sus registros en MongoDB Atlas.

- 📊 **Gestión Financiera Mensual**:
  - **Transacciones unificadas**: Ingresos y egresos clasificados por categoría, fecha y mes.
  - **Saldos iniciales independientes**: Cada mes mantiene su propio saldo inicial guardado en la nube.
  - **Categorías personalizables**: Se inicia con 2 términos genéricos de ejemplo (`Servicios Básicos` y `Varios`) para que cada usuario cree sus propias categorías.
  - **Gráfico comparativo de egresos**: Barras con gradientes para análisis mensual y vista comparativa paralela entre dos meses.

- 📈 **Indicadores Económicos Diarios**:
  - Integración en tiempo real con la API de `mindicador.cl` para mostrar el valor del Dólar Observado, UF, Euro y UTM en Chile.

- 📱 **Diseño 100% Responsivo y Premium**:
  - Estética *Glassmorphism*, gradientes animados, micro-interacciones y tipografía Inter.
  - Adaptabilidad fluida para celulares y dispositivos móviles.

---

## 🛠️ Tecnologías Utilizadas

| Capa | Tecnología | Descripción |
|------|------------|-------------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+) | Interfaz sin librerías pesadas, fetch con cabeceras `Authorization: Bearer <token>`. |
| **Backend** | Node.js, Express.js | API RESTful protegida con middlewares de autenticación JWT y rol Admin. |
| **Base de Datos** | MongoDB Atlas | Base de datos NoSQL en la nube con esquemas modelados en Mongoose. |
| **Seguridad** | `bcryptjs`, `jsonwebtoken` (JWT) | Encriptación de contraseñas con salting y firma de tokens JWT. |
| **Hosting** | Render.com | Despliegue automático de la aplicación Node.js servida 24/7. |

---

## 📁 Estructura del Proyecto

```text
Proyecto_Formulario/
├── models/             → Modelos de Mongoose (Usuario, Transaccion, Categoria, SaldoInicial)
├── middleware/         → Middlewares de autenticación JWT (auth.js)
├── index.js            → Servidor principal Node.js / Express API REST
├── index.html          → Estructura principal y pantallas de Autenticación / App
├── style.css           → Estilos, variables CSS, animaciones y diseño responsivo
├── app.js              → Lógica del cliente, manejo de estado y llamadas a la API
├── package.json        → Dependencias y scripts de ejecución (npm start)
├── wallet-icon.png     → Logotipo oficial
└── README.md           → Documentación del proyecto
```

---

## 🚀 Instalación y Ejecución Local

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/CristobalMorgado/Formulario_Ingresos.git
   cd Formulario_Ingresos
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   Crear un archivo `.env` en la raíz del proyecto con la siguiente estructura:
   ```env
   PORT=3000
   MONGO_URI=tu_cadena_de_conexion_mongodb_atlas
   JWT_SECRET=tu_clave_secreta_jwt
   ```

4. **Iniciar el servidor**:
   ```bash
   npm start
   ```
   Abrir en el navegador: `http://localhost:3000`

---

## 👨‍💻 Autor

**Cristóbal Morgado**  
PROYECTO DESARROLLADO PARA INACAP 2026 — EVA 2 (Front End)
