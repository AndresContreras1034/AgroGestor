CREATE VIEW bi.v_lecturas AS
SELECT cama.codigo AS cama,
       cama.zona,
       lectura.leido_en,
       lectura.temperatura,
       lectura.humedad_relativa,
       lectura.humedad_suelo,
       lectura.ph,
       lectura.conductividad_electrica
FROM monitoreo.lectura AS lectura
JOIN produccion.cama AS cama ON cama.id = lectura.cama_id;
