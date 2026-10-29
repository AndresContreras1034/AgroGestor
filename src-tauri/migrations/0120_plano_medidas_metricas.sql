UPDATE finca.zona
SET pos_x = CASE codigo WHEN 'A' THEN 0 ELSE 110 END,
    pos_y = CASE codigo WHEN 'C' THEN 50 ELSE 0 END,
    ancho = CASE codigo WHEN 'A' THEN 96 ELSE 123 END,
    alto = CASE codigo WHEN 'A' THEN 48 ELSE 34 END
WHERE codigo IN ('A', 'B', 'C');

UPDATE finca.cama_plano AS geometria
SET pos_x = zona.pos_x + 5
      + ((cama.numero - 1) % CASE WHEN cama.zona = 'A' THEN 3 ELSE 4 END)
        * CASE WHEN cama.zona = 'A' THEN 30 ELSE 29 END,
    pos_y = zona.pos_y + 5
      + ((cama.numero - 1) / CASE WHEN cama.zona = 'A' THEN 3 ELSE 4 END) * 14,
    ancho = 25,
    alto = 10
FROM produccion.cama AS cama
JOIN finca.zona AS zona ON zona.codigo = cama.zona
WHERE geometria.cama_id = cama.id;
