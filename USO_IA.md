# 🤖 Uso de Inteligencia Artificial en el Desarrollo

## Contexto

Durante el desarrollo de **Wallet.js — Control Financiero Personal**, se utilizó Inteligencia Artificial como herramienta de apoyo para asegurar las mejores prácticas de **código limpio**, **seguro** y **mantenible**. La IA fue utilizada como un asistente de desarrollo que permitió optimizar la calidad del código siguiendo estándares profesionales de la industria, particularmente en las áreas de **seguridad front-end** y **validación de datos de entrada**.

> **Nota:** La IA no generó la aplicación desde cero. Fue utilizada para refactorizar y mejorar código existente, aplicando patrones de seguridad y buenas prácticas que un equipo senior de desarrollo implementaría en producción.

---

## Ejemplo 1: Refactorización de Seguridad — Mitigación de XSS

### Prompt utilizado

```
Actúa como un desarrollador senior de JavaScript especializado en seguridad web.
Tengo dos funciones (renderIncome y renderExpenses) que construyen listas de
transacciones concatenando strings HTML y usando innerHTML. Necesito que las
refactorices para que construyan el DOM usando document.createElement(),
classList.add(), setAttribute() y textContent en lugar de innerHTML, con el
objetivo de prevenir ataques XSS (Cross-Site Scripting). Mantén exactamente
la misma estructura de nodos y clases CSS.
```

### ¿Qué es XSS y por qué es importante?

**Cross-Site Scripting (XSS)** es una vulnerabilidad de seguridad web donde un atacante puede inyectar scripts maliciosos en una página. Cuando se usa `innerHTML` con datos del usuario, cualquier contenido HTML/JS dentro del texto se interpreta y ejecuta por el navegador.

**Ejemplo de ataque:**
```javascript
// Si un usuario ingresa esto como descripción:
"<img src=x onerror=alert('hackeado')>"

// Con innerHTML, el navegador ejecutaría el código malicioso
element.innerHTML = descripcionDelUsuario; // ❌ VULNERABLE
```

### ¿Cómo se aplicó?

Se reemplazó el patrón inseguro de concatenación de strings + `innerHTML` por construcción programática del DOM:

**Antes (vulnerable a XSS):**
```javascript
function renderIncome() {
    var html = '';
    incomeTxs.forEach(function (tx) {
        html += '<div class="tx-item" data-id="' + tx.id + '">' +
            '<div class="tx-item__info">' +
                '<span class="tx-item__category">' + sanitizeString(tx.category) + '</span>' +
            '</div>' +
            '<span class="tx-item__amount tx-item__amount--income">' + formatCLP(tx.amount) + '</span>' +
        '</div>';
    });
    dom.incomeList.innerHTML = html; // ❌ Inyecta HTML directamente
}
```

**Después (seguro contra XSS):**
```javascript
function renderIncome() {
    while (dom.incomeList.firstChild) {
        dom.incomeList.removeChild(dom.incomeList.firstChild);
    }

    var fragment = document.createDocumentFragment();

    incomeTxs.forEach(function (tx) {
        var item = document.createElement('div');     // ✅ Crea nodo seguro
        item.classList.add('tx-item');                 // ✅ Agrega clase sin HTML
        item.setAttribute('data-id', tx.id);          // ✅ Atributo seguro

        var catSpan = document.createElement('span');
        catSpan.classList.add('tx-item__category');
        catSpan.textContent = tx.category;            // ✅ textContent escapa HTML

        // ... construcción completa del árbol DOM
        fragment.appendChild(item);
    });

    dom.incomeList.appendChild(fragment);             // ✅ Un solo repaint
}
```

### Beneficios obtenidos

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Seguridad** | Vulnerable a XSS | Inmune a inyección de HTML/JS |
| **Rendimiento** | Múltiples reparseos del DOM | Un solo repaint con `DocumentFragment` |
| **Mantenibilidad** | Strings HTML difíciles de depurar | Estructura programática clara |
| **Escapado** | Requería `sanitizeString()` manual | `textContent` escapa automáticamente |

---

## Ejemplo 2: Expresiones Regulares para Sanitización de Inputs

### Prompt utilizado

```
Necesito implementar una validación con Expresiones Regulares (Regex) para
sanitizar los inputs de texto en una aplicación financiera. La Regex debe
permitir solo letras (incluyendo ñ y acentos del español), números, espacios
y los caracteres punto, coma y guión. Debe aplicarse al guardar transacciones
(campo descripción) y al crear/editar categorías (campo nombre). Si el texto
no cumple la Regex, debe detenerse la ejecución y mostrar un mensaje de error.
```

### ¿Qué son las Expresiones Regulares?

Las **Expresiones Regulares (Regex)** son patrones de búsqueda que permiten validar, buscar y manipular cadenas de texto. Son una herramienta fundamental en seguridad web para la **validación de entradas de usuario**.

### ¿Cómo se implementó?

Se definió una constante Regex que actúa como filtro de caracteres permitidos:

```javascript
// Definición de la Regex de validación
var VALID_TEXT_REGEX = /^[a-zA-Z0-9\s.,\-ñÑáéíóúÁÉÍÓÚ]+$/;
```

**Desglose de la expresión:**

| Componente | Significado |
|------------|-------------|
| `^` | Inicio de la cadena |
| `[...]` | Conjunto de caracteres permitidos |
| `a-zA-Z` | Letras minúsculas y mayúsculas (inglés) |
| `0-9` | Dígitos numéricos |
| `\s` | Espacios en blanco |
| `.,\-` | Punto, coma y guión |
| `ñÑáéíóúÁÉÍÓÚ` | Caracteres especiales del español |
| `+` | Uno o más caracteres |
| `$` | Fin de la cadena |

### Puntos de validación implementados

La Regex se aplica en **tres puntos críticos** de entrada de datos:

**1. Al guardar una transacción (descripción):**
```javascript
document.getElementById('modalSave').addEventListener('click', function () {
    var description = descEl.value.trim();
    // ... validaciones previas ...

    // Validación Regex de la descripción
    if (description && !VALID_TEXT_REGEX.test(description)) {
        showToast('La descripción contiene caracteres no permitidos');
        return; // Detiene la ejecución
    }

    // Si pasa la validación, se guarda la transacción
});
```

**2. Al crear una nueva categoría:**
```javascript
function addNewCat() {
    var name = input.value.trim();
    // ... validación de vacío ...

    // Validación Regex del nombre
    if (!VALID_TEXT_REGEX.test(name)) {
        showToast('El nombre contiene caracteres no permitidos');
        return; // Detiene la ejecución
    }

    // Si pasa la validación, se crea la categoría
}
```

**3. Al editar/renombrar una categoría existente:**
```javascript
function saveEdit() {
    var newName = editInput.value.trim();
    // ... validación de vacío ...

    // Validación Regex del nuevo nombre
    if (!VALID_TEXT_REGEX.test(newName)) {
        showToast('El nombre contiene caracteres no permitidos');
        editInput.focus();
        return; // Detiene la ejecución
    }

    // Si pasa la validación, se actualiza la categoría
}
```

### Ejemplos de validación

| Entrada | ¿Válida? | Razón |
|---------|----------|-------|
| `Sueldo de junio` | ✅ Sí | Solo letras y espacios |
| `Pago Nº 3, cuota 1-12` | ❌ No | Contiene `º` no permitido |
| `Mercadería 2026` | ✅ Sí | Letras con acento y números |
| `Pago <script>alert(1)</script>` | ❌ No | Contiene `<`, `>`, `(`, `)` |
| `Café y más` | ❌ No | Contiene `é` ✅ pero `+` no está en la lista... `é` sí está, pero repasemos: `Café y más` → `é` está permitido, pero `á` también. Realmente sí es válida ✅ |

---

## Conclusión

La utilización de IA como herramienta de desarrollo permitió:

1. **Elevar los estándares de seguridad** eliminando vectores de ataque XSS mediante la refactorización de `innerHTML` a `createElement`.
2. **Implementar validación robusta** de entradas de usuario mediante Expresiones Regulares, previniendo la inyección de caracteres maliciosos.
3. **Mantener la integridad del código existente** sin alterar estilos CSS, estructura HTML ni la arquitectura del estado de la aplicación.

Todas las modificaciones fueron revisadas, comprendidas y validadas antes de su integración al proyecto.

---

*Documento generado como parte de los requisitos de la rúbrica de evaluación académica.*
