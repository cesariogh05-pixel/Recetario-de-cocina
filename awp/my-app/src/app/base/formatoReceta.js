// Funciones para adaptar los datos de las recetas al formato que necesitamos

export const DIFICULTADES = ["Fácil", "Intermedio", "Difícil"];

// Agrega "min" al tiempo de preparación
export function tiempoATexto(minutos) {
  return `${Number(minutos)} min`;
}

// Quita el texto "min" y deja solamente el número
export function tiempoAMinutos(texto) {
  return parseInt(String(texto ?? ""), 10) || null;
}

// Separa los consejos en una lista, tomando cada salto de línea como uno nuevo
export function consejosALista(texto) {
  return String(texto ?? "")
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean);
}

// Convierte un ingrediente, paso o consejo en texto simple.
// En la base de datos pueden estar como texto o como objeto
// (ej. { cantidad, unidad, nombre } o { titulo, descripcion }).
export function elementoATexto(item) {
  if (item === null || item === undefined) return "";
  if (typeof item === "string") return item;
  if (typeof item !== "object") return String(item);

  // Lista dentro de la lista: se junta todo en una sola línea
  if (Array.isArray(item)) {
    return item.map(elementoATexto).filter(Boolean).join(" ");
  }

  // Ingrediente: cantidad + unidad + nombre
  if (item.nombre !== undefined) {
    return [item.cantidad, item.unidad, item.nombre]
      .map(elementoATexto)
      .filter(Boolean)
      .join(" ");
  }

  // Paso o consejo: título (si tiene) + descripción
  const texto = item.descripcion ?? item.texto ?? item.consejo;
  if (texto !== undefined) {
    return [item.titulo, texto].map(elementoATexto).filter(Boolean).join(" ");
  }

  // Cualquier otro objeto: junta los textos que tenga dentro
  return Object.values(item).map(elementoATexto).filter(Boolean).join(" ");
}

// Junta los consejos en un solo texto, dejando cada uno en una línea
export function consejosATexto(valor) {
  if (Array.isArray(valor)) {
    return valor.map(elementoATexto).filter(Boolean).join("\n");
  }
  return valor ? String(valor) : "";
}