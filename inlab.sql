-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 20-04-2026 a las 06:21:24
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `inlab`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `consumibles`
--

CREATE TABLE `consumibles` (
  `id` int(11) NOT NULL,
  `nombre_con` varchar(100) NOT NULL,
  `stock` int(11) NOT NULL,
  `id_laboratorio` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `consumibles`
--

INSERT INTO `consumibles` (`id`, `nombre_con`, `stock`, `id_laboratorio`) VALUES
(1, 'Memoria RAM DDR4', 10, 1),
(4, 'Mouses', 35, 1),
(5, 'Teclados', 34, 6),
(6, 'Cables HDMI', 50, 6),
(7, 'Cables HDMI', 5, 1),
(8, 'Cables HDMI', 20, 7),
(9, 'Cable HDMI', 5, 8),
(10, 'Mouses', 20, 8),
(11, 'Teclados', 10, 8),
(12, 'Mouses', 10, 9),
(14, 'Cable HDMI', 5, 10);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `encargado`
--

CREATE TABLE `encargado` (
  `id_encargado` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `encargado`
--

INSERT INTO `encargado` (`id_encargado`, `id_usuario`) VALUES
(10, 12),
(11, 13),
(13, 16),
(14, 17);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `equipo`
--

CREATE TABLE `equipo` (
  `id_equipo` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `no_serie` varchar(100) NOT NULL,
  `numero` int(11) NOT NULL,
  `id_laboratorio` int(11) NOT NULL,
  `tipo` enum('PC','Monitor') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `equipo`
--

INSERT INTO `equipo` (`id_equipo`, `nombre`, `no_serie`, `numero`, `id_laboratorio`, `tipo`) VALUES
(1, '[MANTENIMIENTO] MAC', '2r32e23r', 22, 6, 'PC'),
(2, 'Dell HP23', '2e2er33q', 22, 1, 'PC'),
(3, 'Asus', '008236496', 14, 1, 'Monitor'),
(5, 'HVICTUS', '0003991', 2, 7, 'PC'),
(6, 'HP paviblion', '02930293020', 1, 8, 'PC'),
(7, 'Asus', '29477474', 1, 8, 'Monitor'),
(8, 'Dell', '838989234', 12, 8, 'PC'),
(9, 'Lenovo', '393942', 2, 9, 'PC'),
(10, 'Dell', '2494930', 2, 9, 'Monitor'),
(11, '[MANTENIMIENTO] Lenovo', '393942', 14, 10, 'Monitor');

-- --------------------------------------------------------

--
--Estrucuta de transaccion
--
DELIMITER $$

CREATE PROCEDURE insertar_consumible(
    IN p_nombre VARCHAR(100),
    IN p_stock INT,
    IN p_id_laboratorio INT
)
BEGIN
    START TRANSACTION;

    -- Validar que el stock no sea negativo
    IF p_stock < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El stock no puede ser negativo';
    END IF;

    -- Insertar datos enviados
    INSERT INTO consumibles (nombre_con, stock, id_laboratorio)
    VALUES (p_nombre, p_stock, p_id_laboratorio);

    COMMIT;
END$$

DELIMITER ;


--
-- Estructura de tabla para la tabla `incidencia`
--

CREATE TABLE `incidencia` (
  `id_incidencia` int(11) NOT NULL,
  `id_equipo` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `id_usuario_reporte` int(11) DEFAULT NULL,
  `id_usuario_solucion` int(11) DEFAULT NULL,
  `fecha` date NOT NULL,
  `hora` time NOT NULL,
  `descripcion` text NOT NULL,
  `estado` varchar(100) NOT NULL,
  `foto` longtext DEFAULT NULL,
  `solucion` text DEFAULT NULL,
  `fecha_resolucion` datetime DEFAULT NULL,
  `imagen_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `incidencia`
--

INSERT INTO `incidencia` (`id_incidencia`, `id_equipo`, `id_usuario`, `id_usuario_reporte`, `id_usuario_solucion`, `fecha`, `hora`, `descripcion`, `estado`, `foto`, `solucion`, `fecha_resolucion`, `imagen_url`) VALUES
(24, 2, 1, NULL, NULL, '2026-04-19', '01:21:18', 'asd', 'pendiente', NULL, NULL, NULL, NULL),
(25, 9, 12, 12, 12, '2026-04-19', '09:24:23', 'sisis', 'resuelto', NULL, 'nonono', '2026-04-19 09:24:32', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `laboratorio`
--

CREATE TABLE `laboratorio` (
  `id_laboratorio` int(11) NOT NULL,
  `nombre_lab` varchar(100) NOT NULL,
  `edificio` varchar(25) NOT NULL,
  `planta` varchar(50) NOT NULL,
  `id_encargado` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `laboratorio`
--

INSERT INTO `laboratorio` (`id_laboratorio`, `nombre_lab`, `edificio`, `planta`, `id_encargado`) VALUES
(1, 'Laboratorio de Redes', 'Pesado 2', 'Alta', 13),
(6, 'Laboratorio de Idiomas', 'D', 'Alta', 13),
(7, 'Laboratorio de computo', 'Pesado 2', 'Baja', 10),
(8, 'Labortorio de idiomas', 'A', 'Alta', 10),
(9, 'laboratorio de Idiomas', 'Pesado 1', 'Alta', 10),
(10, 'Lab de prueba', 'E', 'Alta', 14);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario`
--

CREATE TABLE `usuario` (
  `id_usuario` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `appaterno` varchar(100) NOT NULL,
  `apmaterno` varchar(100) DEFAULT NULL,
  `rol` varchar(100) NOT NULL,
  `correo` varchar(255) NOT NULL,
  `password` varchar(100) NOT NULL,
  `id_laboratorio` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuario`
--

INSERT INTO `usuario` (`id_usuario`, `nombre`, `appaterno`, `apmaterno`, `rol`, `correo`, `password`, `id_laboratorio`) VALUES
(1, 'Jorge', 'Salgado', 'Ceja', 'admin', 'jorgesalgado4521@gmail.com', 'Jorge123', NULL),
(12, 'David', 'Rangel', 'Solis', 'encargado', 'DavidSolis@gmail.com', 'David123', NULL),
(13, 'Daniel', 'Salgado', 'Ceja', 'encargado', 'Dani656@gmail.com', 'Dani1234', NULL),
(14, 'Rod', 'Gonzalez', 'Lopez', 'admin', 'rod.wav@gmail.com', 'Rod123', NULL),
(16, 'Rodrigo', 'Torres', 'De la garza', 'encargado', 'Nsqk@gmail.com', 'Nsqk1', NULL),
(17, 'Armando', 'Martinez', 'Lopez', 'encargado', 'Armando@gmail.com', 'Ar123', NULL),
(23, 'roy', 'je', 'je', 'profesor', 'roy@gmail.com', '123', 1);

--
-- Disparadores `usuario`
--
DELIMITER $$
CREATE TRIGGER `actualizar_encargado` AFTER UPDATE ON `usuario` FOR EACH ROW BEGIN
    
    IF OLD.rol = 'encargado' AND NEW.rol <> 'encargado' THEN
        
        DELETE FROM encargado
        WHERE id_usuario = OLD.id_usuario;

    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `eliminar_encargado` BEFORE DELETE ON `usuario` FOR EACH ROW BEGIN
    DELETE FROM encargado
    WHERE id_usuario = OLD.id_usuario;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `insertar_encargado` AFTER INSERT ON `usuario` FOR EACH ROW BEGIN
IF NEW.rol = 'encargado' THEN
INSERT INTO encargado (id_usuario)
VALUES (NEW.id_usuario);
END IF;
END
$$
DELIMITER ;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `consumibles`
--
ALTER TABLE `consumibles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_laboratorio` (`id_laboratorio`);

--
-- Indices de la tabla `encargado`
--
ALTER TABLE `encargado`
  ADD PRIMARY KEY (`id_encargado`),
  ADD KEY `id_usuario` (`id_usuario`);

--
-- Indices de la tabla `equipo`
--
ALTER TABLE `equipo`
  ADD PRIMARY KEY (`id_equipo`),
  ADD KEY `id_laboratorio` (`id_laboratorio`);

--
-- Indices de la tabla `incidencia`
--
ALTER TABLE `incidencia`
  ADD PRIMARY KEY (`id_incidencia`),
  ADD KEY `id_usuario` (`id_usuario`),
  ADD KEY `id_equipo` (`id_equipo`);

--
-- Indices de la tabla `laboratorio`
--
ALTER TABLE `laboratorio`
  ADD PRIMARY KEY (`id_laboratorio`),
  ADD KEY `id_encargado` (`id_encargado`);

--
-- Indices de la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id_usuario`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `consumibles`
--
ALTER TABLE `consumibles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de la tabla `encargado`
--
ALTER TABLE `encargado`
  MODIFY `id_encargado` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de la tabla `equipo`
--
ALTER TABLE `equipo`
  MODIFY `id_equipo` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de la tabla `incidencia`
--
ALTER TABLE `incidencia`
  MODIFY `id_incidencia` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT de la tabla `laboratorio`
--
ALTER TABLE `laboratorio`
  MODIFY `id_laboratorio` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `consumibles`
--
ALTER TABLE `consumibles`
  ADD CONSTRAINT `consumibles_ibfk_1` FOREIGN KEY (`id_laboratorio`) REFERENCES `laboratorio` (`id_laboratorio`);

--
-- Filtros para la tabla `encargado`
--
ALTER TABLE `encargado`
  ADD CONSTRAINT `encargado_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `equipo`
--
ALTER TABLE `equipo`
  ADD CONSTRAINT `equipo_ibfk_1` FOREIGN KEY (`id_laboratorio`) REFERENCES `laboratorio` (`id_laboratorio`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `incidencia`
--
ALTER TABLE `incidencia`
  ADD CONSTRAINT `incidencia_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `incidencia_ibfk_2` FOREIGN KEY (`id_equipo`) REFERENCES `equipo` (`id_equipo`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `laboratorio`
--
ALTER TABLE `laboratorio`
  ADD CONSTRAINT `laboratorio_ibfk_1` FOREIGN KEY (`id_encargado`) REFERENCES `encargado` (`id_encargado`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
