\i /docker-entrypoint-initdb.d/base-schema

UPDATE usuarios
SET contrasena_hash = '$2b$10$Dy3dqXm6cyUNveockqx0Z.NLAiGX3X6ReD7zwK6GjtIWbbcTEeotK'
WHERE nombre_usuario = 'admin';
