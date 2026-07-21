-- MySQL dump 10.13  Distrib 8.0.31, for Win64 (x86_64)
--
-- Host: localhost    Database: saas_facturacion
-- ------------------------------------------------------
-- Server version	8.0.31

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `actividades_economicas`
--

DROP TABLE IF EXISTS `actividades_economicas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `actividades_economicas` (
  `codigo_giro` varchar(5) NOT NULL,
  `descripcion_giro` varchar(255) NOT NULL,
  PRIMARY KEY (`codigo_giro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `actividades_economicas`
--

LOCK TABLES `actividades_economicas` WRITE;
/*!40000 ALTER TABLE `actividades_economicas` DISABLE KEYS */;
INSERT INTO `actividades_economicas` VALUES ('46300','Venta al por mayor de productos alimenticios'),('47110','Venta al por menor en establecimientos no especializados'),('56100','Restaurantes y servicios de comidas móviles'),('62010','Desarrollo de sistemas informáticos'),('62020','Consultoría de tecnologías de la información'),('62090','Otras actividades de tecnología de la información'),('68200','Alquiler de bienes inmuebles propios'),('86900','Otras actividades de atención de la salud humana'),('96090','Otras actividades de servicios personales n.c.p.');
/*!40000 ALTER TABLE `actividades_economicas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ajustes_inventario`
--

DROP TABLE IF EXISTS `ajustes_inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ajustes_inventario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `organizacion_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `bodega_id` int DEFAULT NULL,
  `tipo_ajuste` enum('Entrada','Salida') NOT NULL,
  `cantidad` decimal(10,2) NOT NULL,
  `motivo` enum('Merma','Vencimiento','Robo','Devolucion_Proveedor','Inventario_Inicial','Otro') NOT NULL,
  `descripcion` text,
  `costo_unitario` decimal(10,2) NOT NULL,
  `usuario_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `organizacion_id` (`organizacion_id`),
  KEY `producto_id` (`producto_id`),
  KEY `bodega_id` (`bodega_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `ajustes_inventario_ibfk_1` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ajustes_inventario_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ajustes_inventario_ibfk_3` FOREIGN KEY (`bodega_id`) REFERENCES `bodegas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ajustes_inventario_ibfk_4` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ajustes_inventario`
--

LOCK TABLES `ajustes_inventario` WRITE;
/*!40000 ALTER TABLE `ajustes_inventario` DISABLE KEYS */;
/*!40000 ALTER TABLE `ajustes_inventario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bodegas`
--

DROP TABLE IF EXISTS `bodegas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bodegas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `organizacion_id` int NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_bodega_org` (`organizacion_id`,`nombre`),
  CONSTRAINT `bodegas_ibfk_1` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bodegas`
--

LOCK TABLES `bodegas` WRITE;
/*!40000 ALTER TABLE `bodegas` DISABLE KEYS */;
INSERT INTO `bodegas` VALUES (1,1,'Bodega Principal','San Salvador, El Salvador',NULL,1,'2026-07-20 20:31:56');
/*!40000 ALTER TABLE `bodegas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categorias`
--

DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `organizacion_id` int NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text,
  `icono` varchar(50) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_categoria_org` (`organizacion_id`,`nombre`),
  CONSTRAINT `categorias_ibfk_1` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias`
--

LOCK TABLES `categorias` WRITE;
/*!40000 ALTER TABLE `categorias` DISABLE KEYS */;
/*!40000 ALTER TABLE `categorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `organizacion_id` int NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `dui` varchar(10) DEFAULT NULL,
  `nit` varchar(20) DEFAULT NULL,
  `nrc` varchar(20) DEFAULT NULL,
  `giro` varchar(100) DEFAULT NULL,
  `tipo_contribuyente` enum('Grande','Mediano','Pequeño','Exento') DEFAULT 'Pequeño',
  `direccion` varchar(255) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `correo` varchar(100) DEFAULT NULL,
  `telefono_whatsapp` varchar(20) DEFAULT NULL,
  `id_departamento` varchar(2) DEFAULT NULL,
  `id_municipio` varchar(2) DEFAULT NULL,
  `direccion_linea` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dui` (`dui`),
  UNIQUE KEY `unique_org_nit` (`organizacion_id`,`nit`),
  KEY `idx_clientes_org` (`organizacion_id`),
  KEY `id_departamento` (`id_departamento`,`id_municipio`),
  CONSTRAINT `clientes_ibfk_1` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `clientes_ibfk_2` FOREIGN KEY (`id_departamento`, `id_municipio`) REFERENCES `municipios` (`id_departamento`, `id_municipio`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes`
--

LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
INSERT INTO `clientes` VALUES (1,2,'CLIENTE MEMBRESÍA',NULL,'N/A',NULL,NULL,'Exento',NULL,NULL,NULL,NULL,NULL,NULL,NULL),(4,2,'Empresa de prueba',NULL,'0804-0123-101-4',NULL,NULL,'Exento',NULL,NULL,NULL,NULL,NULL,NULL,NULL),(5,4,'gffg',NULL,'0804-0123-101-6',NULL,NULL,'Exento',NULL,NULL,NULL,NULL,NULL,NULL,NULL),(6,5,'Empresa de prueba01',NULL,'0804-0123-101-7',NULL,NULL,'Exento',NULL,NULL,NULL,NULL,NULL,NULL,NULL),(9,4,'gffg',NULL,'0804-0123-101-9',NULL,NULL,'Exento',NULL,NULL,NULL,NULL,NULL,NULL,NULL),(21,6,'MK sor',NULL,'0804-0123-101-6',NULL,NULL,'Exento',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `compras_gastos`
--

DROP TABLE IF EXISTS `compras_gastos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `compras_gastos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `organizacion_id` int NOT NULL,
  `proveedor_nombre` varchar(100) NOT NULL,
  `tipo_documento` varchar(20) NOT NULL,
  `numero_comprobante` varchar(30) NOT NULL,
  `tipo_egreso` enum('Compra','Gasto_Operativo') NOT NULL,
  `descripcion` text,
  `monto_subtotal` decimal(10,2) NOT NULL,
  `iva_credito_fiscal` decimal(10,2) DEFAULT '0.00',
  `total` decimal(10,2) NOT NULL,
  `url_comprobante_foto` varchar(255) DEFAULT NULL,
  `fecha_registro` date NOT NULL,
  `proveedor_id` int DEFAULT NULL,
  `tipo_comprobante` enum('Factura','Ticket','Nota de Crédito','Otro') DEFAULT 'Factura',
  `estado_comprobante` enum('Pendiente','Pagado','Cancelado') DEFAULT 'Pendiente',
  PRIMARY KEY (`id`),
  KEY `organizacion_id` (`organizacion_id`),
  KEY `proveedor_id` (`proveedor_id`),
  CONSTRAINT `compras_gastos_ibfk_1` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `compras_gastos_ibfk_2` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `compras_gastos`
--

LOCK TABLES `compras_gastos` WRITE;
/*!40000 ALTER TABLE `compras_gastos` DISABLE KEYS */;
/*!40000 ALTER TABLE `compras_gastos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `configuracion_saas`
--

DROP TABLE IF EXISTS `configuracion_saas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuracion_saas` (
  `id` int NOT NULL DEFAULT '1',
  `organizacion_id` int DEFAULT '1',
  `nombre_empresa` varchar(100) NOT NULL,
  `nombre_comercial` varchar(100) DEFAULT NULL,
  `nit` varchar(20) NOT NULL,
  `nrc` varchar(20) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `correo` varchar(100) DEFAULT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_config_organizacion` (`organizacion_id`),
  CONSTRAINT `fk_config_organizacion` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuracion_saas`
--

LOCK TABLES `configuracion_saas` WRITE;
/*!40000 ALTER TABLE `configuracion_saas` DISABLE KEYS */;
INSERT INTO `configuracion_saas` VALUES (1,1,'Mi SaaS de Facturación','Facturacion SA','0000-000000-000-0','0000077','San Salvador, El Salvador','0000-0000','info@misadas.com','','2026-07-17 23:12:50','2026-07-19 03:25:56');
/*!40000 ALTER TABLE `configuracion_saas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `costos_historicos`
--

DROP TABLE IF EXISTS `costos_historicos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `costos_historicos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producto_id` int NOT NULL,
  `proveedor_id` int DEFAULT NULL,
  `costo_anterior` decimal(10,2) NOT NULL,
  `costo_nuevo` decimal(10,2) NOT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `usuario_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `producto_id` (`producto_id`),
  KEY `proveedor_id` (`proveedor_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `costos_historicos_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `costos_historicos_ibfk_2` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE SET NULL,
  CONSTRAINT `costos_historicos_ibfk_3` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `costos_historicos`
--

LOCK TABLES `costos_historicos` WRITE;
/*!40000 ALTER TABLE `costos_historicos` DISABLE KEYS */;
/*!40000 ALTER TABLE `costos_historicos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departamentos`
--

DROP TABLE IF EXISTS `departamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departamentos` (
  `id_departamento` varchar(2) NOT NULL,
  `nombre_departamento` varchar(50) NOT NULL,
  PRIMARY KEY (`id_departamento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departamentos`
--

LOCK TABLES `departamentos` WRITE;
/*!40000 ALTER TABLE `departamentos` DISABLE KEYS */;
INSERT INTO `departamentos` VALUES ('01','Ahuachapán'),('02','Santa Ana'),('03','Sonsonate'),('04','Chalatenango'),('05','La Libertad'),('06','San Salvador'),('07','Cuscatlán'),('08','La Paz'),('09','Cabañas'),('10','San Vicente'),('11','Usulután'),('12','San Miguel'),('13','Morazán'),('14','La Unión');
/*!40000 ALTER TABLE `departamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `detalles_compra`
--

DROP TABLE IF EXISTS `detalles_compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalles_compra` (
  `id` int NOT NULL AUTO_INCREMENT,
  `compra_gasto_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `cantidad` decimal(10,2) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `compra_gasto_id` (`compra_gasto_id`),
  KEY `producto_id` (`producto_id`),
  CONSTRAINT `detalles_compra_ibfk_1` FOREIGN KEY (`compra_gasto_id`) REFERENCES `compras_gastos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `detalles_compra_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalles_compra`
--

LOCK TABLES `detalles_compra` WRITE;
/*!40000 ALTER TABLE `detalles_compra` DISABLE KEYS */;
/*!40000 ALTER TABLE `detalles_compra` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `detalles_factura`
--

DROP TABLE IF EXISTS `detalles_factura`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalles_factura` (
  `id` int NOT NULL AUTO_INCREMENT,
  `factura_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `cantidad` decimal(10,2) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `iva` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `factura_id` (`factura_id`),
  KEY `producto_id` (`producto_id`),
  CONSTRAINT `detalles_factura_ibfk_1` FOREIGN KEY (`factura_id`) REFERENCES `facturas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `detalles_factura_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalles_factura`
--

LOCK TABLES `detalles_factura` WRITE;
/*!40000 ALTER TABLE `detalles_factura` DISABLE KEYS */;
INSERT INTO `detalles_factura` VALUES (1,1,2,1.00,10.00,10.00,1.30),(2,1,2,1.00,10.00,10.00,1.30),(3,1,2,1.00,10.00,10.00,1.30),(4,2,2,1.00,10.00,10.00,1.30),(5,3,2,1.00,10.00,10.00,1.30),(6,4,2,1.00,10.00,10.00,1.30),(7,5,2,1.00,10.00,10.00,1.30),(8,6,2,1.00,10.00,10.00,1.30),(9,7,2,1.00,10.00,10.00,1.30),(10,1,2,1.00,10.00,10.00,1.30);
/*!40000 ALTER TABLE `detalles_factura` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `empleados_nomina`
--

DROP TABLE IF EXISTS `empleados_nomina`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `empleados_nomina` (
  `id` int NOT NULL AUTO_INCREMENT,
  `organizacion_id` int NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `salario_base` decimal(10,2) NOT NULL,
  `dui` varchar(10) NOT NULL,
  `cotiza_isss` tinyint(1) DEFAULT '1',
  `cotiza_afp` tinyint(1) DEFAULT '1',
  `afp_numero` varchar(20) DEFAULT NULL,
  `isss_numero` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dui` (`dui`),
  KEY `organizacion_id` (`organizacion_id`),
  CONSTRAINT `empleados_nomina_ibfk_1` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `empleados_nomina`
--

LOCK TABLES `empleados_nomina` WRITE;
/*!40000 ALTER TABLE `empleados_nomina` DISABLE KEYS */;
/*!40000 ALTER TABLE `empleados_nomina` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `etiquetas`
--

DROP TABLE IF EXISTS `etiquetas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `etiquetas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `organizacion_id` int NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `color` varchar(7) DEFAULT '#6b7280',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_etiqueta_org` (`organizacion_id`,`nombre`),
  CONSTRAINT `etiquetas_ibfk_1` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `etiquetas`
--

LOCK TABLES `etiquetas` WRITE;
/*!40000 ALTER TABLE `etiquetas` DISABLE KEYS */;
/*!40000 ALTER TABLE `etiquetas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `facturas`
--

DROP TABLE IF EXISTS `facturas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `facturas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `organizacion_id` int NOT NULL,
  `bodega_id` int DEFAULT NULL,
  `usuario_id` int NOT NULL,
  `cliente_id` int NOT NULL,
  `tipo_documento` enum('FAF','CCF') NOT NULL,
  `numero_correlativo` varchar(20) NOT NULL,
  `subtotal_sumas` decimal(10,2) NOT NULL,
  `descuento` decimal(10,2) DEFAULT '0.00',
  `iva_13` decimal(10,2) DEFAULT '0.00',
  `retencion_1` decimal(10,2) DEFAULT '0.00',
  `percepcion_1` decimal(10,2) DEFAULT '0.00',
  `intereses_mora` decimal(10,2) DEFAULT '0.00',
  `total_pagar` decimal(10,2) NOT NULL,
  `estado` enum('Borrador','Emitida','Pagada','Anulada') DEFAULT 'Borrador',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `eliminado_en` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `cliente_id` (`cliente_id`),
  KEY `idx_facturas_org` (`organizacion_id`),
  KEY `idx_facturas_eliminado` (`eliminado_en`),
  KEY `fk_factura_bodega` (`bodega_id`),
  CONSTRAINT `facturas_ibfk_1` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `facturas_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `facturas_ibfk_3` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`),
  CONSTRAINT `fk_factura_bodega` FOREIGN KEY (`bodega_id`) REFERENCES `bodegas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `facturas`
--

LOCK TABLES `facturas` WRITE;
/*!40000 ALTER TABLE `facturas` DISABLE KEYS */;
INSERT INTO `facturas` VALUES (1,4,NULL,2,9,'FAF','MEM-000001',10.00,0.00,1.30,0.00,0.00,0.00,11.30,'Emitida','2026-07-20 03:27:59',NULL);
/*!40000 ALTER TABLE `facturas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `marcas`
--

DROP TABLE IF EXISTS `marcas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marcas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `organizacion_id` int NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_marca_org` (`organizacion_id`,`nombre`),
  CONSTRAINT `marcas_ibfk_1` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `marcas`
--

LOCK TABLES `marcas` WRITE;
/*!40000 ALTER TABLE `marcas` DISABLE KEYS */;
/*!40000 ALTER TABLE `marcas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movimientos_inventario`
--

DROP TABLE IF EXISTS `movimientos_inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movimientos_inventario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `organizacion_id` int NOT NULL DEFAULT '1',
  `producto_id` int NOT NULL,
  `bodega_id` int DEFAULT NULL,
  `tipo_movimiento` enum('Entrada','Salida','Ajuste') NOT NULL,
  `cantidad` decimal(10,2) NOT NULL,
  `stock_anterior` decimal(10,2) NOT NULL,
  `stock_nuevo` decimal(10,2) NOT NULL,
  `referencia_tipo` enum('Compra','Factura','Ajuste','Traslado','Devolucion') NOT NULL,
  `referencia_id` int NOT NULL,
  `costo_unitario` decimal(10,2) NOT NULL,
  `observacion` text,
  `usuario_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `idx_movimientos_producto` (`producto_id`),
  KEY `idx_movimientos_referencia` (`referencia_tipo`,`referencia_id`),
  KEY `idx_movimientos_bodega` (`bodega_id`),
  KEY `idx_movimientos_fecha` (`created_at`),
  KEY `idx_movimientos_producto_bodega_fecha` (`producto_id`,`bodega_id`,`created_at`),
  KEY `fk_movimiento_organizacion` (`organizacion_id`),
  CONSTRAINT `fk_movimiento_organizacion` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `movimientos_inventario_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `movimientos_inventario_ibfk_2` FOREIGN KEY (`bodega_id`) REFERENCES `bodegas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `movimientos_inventario_ibfk_3` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movimientos_inventario`
--

LOCK TABLES `movimientos_inventario` WRITE;
/*!40000 ALTER TABLE `movimientos_inventario` DISABLE KEYS */;
/*!40000 ALTER TABLE `movimientos_inventario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `municipios`
--

DROP TABLE IF EXISTS `municipios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `municipios` (
  `id_municipio` varchar(2) NOT NULL,
  `id_departamento` varchar(2) NOT NULL,
  `nombre_municipio` varchar(100) NOT NULL,
  PRIMARY KEY (`id_departamento`,`id_municipio`),
  CONSTRAINT `municipios_ibfk_1` FOREIGN KEY (`id_departamento`) REFERENCES `departamentos` (`id_departamento`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `municipios`
--

LOCK TABLES `municipios` WRITE;
/*!40000 ALTER TABLE `municipios` DISABLE KEYS */;
INSERT INTO `municipios` VALUES ('01','01','Ahuachapán'),('02','01','Apaneca'),('03','01','Atiquizaya'),('04','01','Concepción de Ataco'),('05','01','El Refugio'),('06','01','Guaymango'),('07','01','Jujutla'),('08','01','San Francisco Menéndez'),('09','01','San Lorenzo'),('10','01','San Pedro Puxtla'),('11','01','Tacuba'),('12','01','Turín'),('01','02','Santa Ana'),('02','02','Candelaria de la Frontera'),('03','02','Chalchuapa'),('04','02','Coatepeque'),('05','02','El Congo'),('06','02','El Porvenir'),('07','02','Masahuat'),('08','02','Metapán'),('09','02','San Antonio Pajonal'),('10','02','San Sebastián Salitrillo'),('11','02','Santa Rosa Guachipilín'),('12','02','Santiago de la Frontera'),('13','02','Texistepeque'),('01','03','Sonsonate'),('02','03','Acajutla'),('03','03','Armenia'),('04','03','Caluco'),('05','03','Cuisnahuat'),('06','03','Izalco'),('07','03','Juayúa'),('08','03','Nahuizalco'),('09','03','Nahulingo'),('10','03','Salcoatitán'),('11','03','San Antonio del Monte'),('12','03','San Julián'),('13','03','Santa Catarina Masahuat'),('14','03','Santa Isabel Ishuatán'),('15','03','Santo Domingo de Guzmán'),('16','03','Sonsonate'),('01','04','Chalatenango'),('02','04','Agua Caliente'),('03','04','Arcatao'),('04','04','Azacualpa'),('05','04','Cinfuegos'),('06','04','Comalapa'),('07','04','Concepción Quezaltepeque'),('08','04','El Carrizal'),('09','04','El Paraíso'),('10','04','La Laguna'),('11','04','La Palma'),('12','04','La Reina'),('13','04','Las Vueltas'),('14','04','Nueva Concepción'),('15','04','Nueva Trinidad'),('16','04','Nombre de Jesús'),('17','04','Ojos de Agua'),('18','04','Potonico'),('19','04','San Antonio de la Cruz'),('20','04','San Antonio Los Ranchos'),('21','04','San Fernando'),('22','04','San Francisco Lempa'),('23','04','San Francisco Morazán'),('24','04','San Ignacio'),('25','04','San Isidro Labrador'),('26','04','Las Flores'),('27','04','San Luis del Carmen'),('28','04','San Miguel de Mercedes'),('29','04','San Rafael'),('30','04','Santa Rita'),('31','04','Tejutla'),('32','04','Reubicación'),('33','04','San José Cancasque'),('01','05','Santa Tecla'),('02','05','Antiguo Cuscatlán'),('03','05','Chiltiupán'),('04','05','Ciudad Arce'),('05','05','Colón'),('06','05','Comasagua'),('07','05','Huizúcar'),('08','05','Jayaque'),('09','05','Jicalapa'),('10','05','La Libertad'),('11','05','Nuevo Cuscatlán'),('12','05','San Juan Opico'),('13','05','Quezaltepeque'),('14','05','Sacacoyo'),('15','05','San José Villanueva'),('16','05','San Matías'),('17','05','San Pablo Tacachico'),('18','05','Talnique'),('19','05','Tamanique'),('20','05','Teotepeque'),('21','05','Tepecoyo'),('22','05','Zaragoza'),('01','06','San Salvador'),('02','06','Aguilares'),('03','06','Apopa'),('04','06','Ayutuxtepeque'),('05','06','Cuscatancingo'),('06','06','Ciudad Delgado'),('07','06','El Paisnal'),('08','06','Guazapa'),('09','06','Ilopango'),('10','06','Mejicanos'),('11','06','Nejapa'),('12','06','Panchimalco'),('13','06','Rosario de Mora'),('14','06','San Marcos'),('15','06','Santiago Texacuangos'),('16','06','Santo Domingo'),('17','06','Soyapango'),('18','06','Tonacatepeque'),('19','06','San Martín'),('01','07','Cojutepeque'),('02','07','Candelaria'),('03','07','El Carmen'),('04','07','El Rosario'),('05','07','Monte San Juan'),('06','07','Oratorio de Concepción'),('07','07','San Bartolomé Perulapía'),('08','07','San Cristóbal'),('09','07','San José Guayabal'),('10','07','San Pedro Perulapán'),('11','07','San Rafael Cedros'),('12','07','San Ramón'),('13','07','Santa Cruz Analquito'),('14','07','Santa Cruz Michapa'),('15','07','Suchitoto'),('16','07','Tenancingo'),('01','08','Zacatecoluca'),('02','08','Cuyultitán'),('03','08','El Rosario'),('04','08','Jerusalén'),('05','08','Mercedes La Ceiba'),('06','08','Olocuilta'),('07','08','Paraíso de Osorio'),('08','08','San Antonio Masahuat'),('09','08','San Emigdio'),('10','08','San Francisco Chinameca'),('11','08','San Pedro Nonualco'),('12','08','San Juan Nonualco'),('13','08','San Juan Talpa'),('14','08','San Juan Tepezontes'),('15','08','San Luis La Herradura'),('16','08','San Luis Talpa'),('17','08','San Miguel Tepezontes'),('18','08','San Pedro Masahuat'),('19','08','San Rafael Obrajuelo'),('20','08','Santa María Ostuma'),('21','08','Santiago Nonualco'),('22','08','Tapalhuaca'),('01','09','Sensuntepeque'),('02','09','Cinquera'),('03','09','Dolores'),('04','09','Guacotecti'),('05','09','Ilobasco'),('06','09','Jutiapa'),('07','09','San Isidro'),('08','09','Tejutepeque'),('09','09','Victoria'),('01','10','San Vicente'),('02','10','Apastepeque'),('03','10','Guadalupe'),('04','10','San Cayetano Istepeque'),('05','10','Santa Clara'),('06','10','Santo Domingo'),('07','10','San Esteban Catarina'),('08','10','San Ildefonso'),('09','10','San Lorenzo'),('10','10','San Sebastián'),('11','10','Tepetitán'),('12','10','Tecoluca'),('13','10','Verapaz'),('01','11','Usulután'),('02','11','Alegría'),('03','11','Berlín'),('04','11','California'),('05','11','Concepción Batres'),('06','11','El Triunfo'),('07','11','Ereguayquín'),('08','11','Estanzuelas'),('09','11','Jiquilisco'),('10','11','Jucuapa'),('11','11','Jucuarán'),('12','11','Mercedes Umaña'),('13','11','Nueva Granada'),('14','11','Ozatlán'),('15','11','Puerto El Triunfo'),('16','11','San Agustín'),('17','11','San Buenaventura'),('18','11','San Dionisio'),('19','11','Santa Elena'),('20','11','San Francisco Javier'),('21','11','Santa María'),('22','11','Santiago de María'),('23','11','Tecapán'),('01','12','San Miguel'),('02','12','Carolina'),('03','12','Ciudad Barrios'),('04','12','Comacarán'),('05','12','Chinameca'),('06','12','Chirilagua'),('07','12','El Tránsito'),('08','12','Lolotique'),('09','12','Moncagua'),('10','12','Nueva Guadalupe'),('11','12','Nuevo Edén de San Juan'),('12','12','Quelepa'),('13','12','San Antonio'),('14','12','San Gerardo'),('15','12','San Jorge'),('16','12','San Luis de la Reina'),('17','12','San Rafael Oriente'),('18','12','Sesori'),('19','12','Uluazapa'),('20','12','Villatoro'),('01','13','San Francisco Gotera'),('02','13','Arambala'),('03','13','Cacaopera'),('04','13','Corinto'),('05','13','Chilanga'),('06','13','Delicias de Concepción'),('07','13','El Divisadero'),('08','13','El Rosario'),('09','13','Gualococti'),('10','13','Guatajiagua'),('11','13','Joateca'),('12','13','Jocoaitique'),('13','13','Jocoro'),('14','13','Lolotiquillo'),('15','13','Meanguera'),('16','13','Osicala'),('17','13','Perquín'),('18','13','San Carlos'),('19','13','San Fernando'),('20','13','San Isidro'),('21','13','San Simón'),('22','13','Sensembra'),('23','13','Sociedad'),('24','13','Torola'),('25','13','Yamabal'),('26','13','Yoloaiquín'),('01','14','La Unión'),('02','14','Anamorós'),('03','14','Bolívar'),('04','14','Concepción de Oriente'),('05','14','Conchagua'),('06','14','El Carmen'),('07','14','El Sauce'),('08','14','Intipucá'),('09','14','Lislique'),('10','14','Meanguera del Golfo'),('11','14','Nueva Esparta'),('12','14','Pasaquina'),('13','14','Polorós'),('14','14','San Alejo'),('15','14','San José'),('16','14','Santa Rosa de Lima'),('17','14','Yayantique'),('18','14','Yucuaiquín');
/*!40000 ALTER TABLE `municipios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organizaciones`
--

DROP TABLE IF EXISTS `organizaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organizaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre_empresa` varchar(100) NOT NULL,
  `nit` varchar(20) NOT NULL,
  `nrc` varchar(20) DEFAULT NULL,
  `tipo_contribuyente` enum('Grande','Mediano','Pequeño','Exento') NOT NULL,
  `estado` enum('Activo','Inactivo') DEFAULT 'Activo',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `logo_url` varchar(255) DEFAULT NULL,
  `nombre_comercial` varchar(100) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `telefono_whatsapp` varchar(20) DEFAULT NULL,
  `correo_contacto` varchar(100) DEFAULT NULL,
  `ambiente` enum('Pruebas','Producción') DEFAULT 'Pruebas',
  `token_mh` varchar(255) DEFAULT NULL,
  `llave_privada_p12` text,
  `tipo_organizacion` enum('Empresa Comercial','Clínica General','Clínica Dental','Clinica Veterinaria') DEFAULT 'Empresa Comercial',
  `id_departamento` varchar(2) DEFAULT NULL,
  `id_municipio` varchar(2) DEFAULT NULL,
  `direccion_linea` varchar(255) DEFAULT NULL,
  `codigo_giro` varchar(5) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nit` (`nit`),
  UNIQUE KEY `nrc` (`nrc`),
  KEY `id_departamento` (`id_departamento`,`id_municipio`),
  KEY `codigo_giro` (`codigo_giro`),
  CONSTRAINT `organizaciones_ibfk_1` FOREIGN KEY (`id_departamento`, `id_municipio`) REFERENCES `municipios` (`id_departamento`, `id_municipio`) ON DELETE SET NULL,
  CONSTRAINT `organizaciones_ibfk_2` FOREIGN KEY (`codigo_giro`) REFERENCES `actividades_economicas` (`codigo_giro`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organizaciones`
--

LOCK TABLES `organizaciones` WRITE;
/*!40000 ALTER TABLE `organizaciones` DISABLE KEYS */;
INSERT INTO `organizaciones` VALUES (1,'SuperAdmin','0000-000000-000-0',NULL,'Exento','Activo','2026-07-17 15:56:43',NULL,NULL,NULL,NULL,NULL,NULL,'Pruebas',NULL,NULL,'Empresa Comercial',NULL,NULL,NULL,NULL),(2,'Empresa de prueba','0804-0123-101-4','65739s','Mediano','Activo','2026-07-17 18:01:26','','Prueba SA de CV','Colonia Divina Providencia, BK Y Pasaje 7','71409012','71409012','','Pruebas',NULL,NULL,'Empresa Comercial',NULL,NULL,NULL,NULL),(4,'gffg','0804-0123-101-9','65739f','Grande','Activo','2026-07-17 18:22:28','','Prueba SA de CVff','Colonia Divina Providencia, BK Y Pasaje 7','60490303','60490303',NULL,'Pruebas',NULL,NULL,'Empresa Comercial',NULL,NULL,NULL,NULL),(5,'Empresa de prueba01','0804-0123-101-7','657397y','Pequeño','Activo','2026-07-18 05:15:28','','Prueba SA de CVffe','Colonia Divina Providencia, BK Y Pasaje 7, Numero 9','71409012','71409012',NULL,'Pruebas',NULL,NULL,'Empresa Comercial',NULL,NULL,NULL,NULL),(6,'MK sor','0804-0123-101-6','95899565','Pequeño','Activo','2026-07-19 03:15:42','','dffgfghfd','Colonia Divina Providencia, BK Y Pasaje 7','71409016','984849845',NULL,'Pruebas',NULL,NULL,'Empresa Comercial',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `organizaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parametros_inventario`
--

DROP TABLE IF EXISTS `parametros_inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parametros_inventario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `organizacion_id` int NOT NULL,
  `metodo_costeo` enum('Promedio_Ponderado','FIFO','LIFO') NOT NULL DEFAULT 'Promedio_Ponderado',
  `bodega_principal_id` int DEFAULT NULL,
  `dias_para_vencimiento` int DEFAULT '0',
  `notificar_stock_minimo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_parametros_org` (`organizacion_id`),
  KEY `fk_parametros_bodega` (`bodega_principal_id`),
  CONSTRAINT `fk_parametros_bodega` FOREIGN KEY (`bodega_principal_id`) REFERENCES `bodegas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `parametros_inventario_ibfk_1` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parametros_inventario`
--

LOCK TABLES `parametros_inventario` WRITE;
/*!40000 ALTER TABLE `parametros_inventario` DISABLE KEYS */;
INSERT INTO `parametros_inventario` VALUES (1,1,'Promedio_Ponderado',1,0,1,'2026-07-20 20:32:16','2026-07-20 20:32:16');
/*!40000 ALTER TABLE `parametros_inventario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `planillas_mensuales`
--

DROP TABLE IF EXISTS `planillas_mensuales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `planillas_mensuales` (
  `id` int NOT NULL AUTO_INCREMENT,
  `organizacion_id` int NOT NULL,
  `empleado_id` int NOT NULL,
  `mes` tinyint NOT NULL,
  `anio` int NOT NULL,
  `dias_trabajados` tinyint DEFAULT '30',
  `horas_extras_monto` decimal(10,2) DEFAULT '0.00',
  `nocturnidad_monto` decimal(10,2) DEFAULT '0.00',
  `descuento_isss` decimal(10,2) DEFAULT '0.00',
  `descuento_afp` decimal(10,2) DEFAULT '0.00',
  `descuento_renta` decimal(10,2) DEFAULT '0.00',
  `salario_neto_pagar` decimal(10,2) NOT NULL,
  `estado` enum('Pendiente','Pagado') DEFAULT 'Pendiente',
  PRIMARY KEY (`id`),
  KEY `empleado_id` (`empleado_id`),
  KEY `idx_planillas_org` (`organizacion_id`),
  CONSTRAINT `planillas_mensuales_ibfk_1` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `planillas_mensuales_ibfk_2` FOREIGN KEY (`empleado_id`) REFERENCES `empleados_nomina` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `planillas_mensuales`
--

LOCK TABLES `planillas_mensuales` WRITE;
/*!40000 ALTER TABLE `planillas_mensuales` DISABLE KEYS */;
/*!40000 ALTER TABLE `planillas_mensuales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `producto_bodega`
--

DROP TABLE IF EXISTS `producto_bodega`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `producto_bodega` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producto_id` int NOT NULL,
  `bodega_id` int NOT NULL,
  `stock_actual` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stock_minimo` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stock_maximo` decimal(10,2) NOT NULL DEFAULT '0.00',
  `ultima_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_producto_bodega` (`producto_id`,`bodega_id`),
  KEY `idx_producto_bodega_producto` (`producto_id`),
  KEY `idx_producto_bodega_bodega` (`bodega_id`),
  CONSTRAINT `producto_bodega_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `producto_bodega_ibfk_2` FOREIGN KEY (`bodega_id`) REFERENCES `bodegas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `producto_bodega`
--

LOCK TABLES `producto_bodega` WRITE;
/*!40000 ALTER TABLE `producto_bodega` DISABLE KEYS */;
/*!40000 ALTER TABLE `producto_bodega` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `producto_componentes`
--

DROP TABLE IF EXISTS `producto_componentes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `producto_componentes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producto_kit_id` int NOT NULL,
  `producto_componente_id` int NOT NULL,
  `cantidad` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_kit_componente` (`producto_kit_id`,`producto_componente_id`),
  KEY `producto_componente_id` (`producto_componente_id`),
  CONSTRAINT `producto_componentes_ibfk_1` FOREIGN KEY (`producto_kit_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `producto_componentes_ibfk_2` FOREIGN KEY (`producto_componente_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `producto_componentes`
--

LOCK TABLES `producto_componentes` WRITE;
/*!40000 ALTER TABLE `producto_componentes` DISABLE KEYS */;
/*!40000 ALTER TABLE `producto_componentes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `producto_etiquetas`
--

DROP TABLE IF EXISTS `producto_etiquetas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `producto_etiquetas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producto_id` int NOT NULL,
  `etiqueta_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_producto_etiqueta` (`producto_id`,`etiqueta_id`),
  KEY `idx_producto_etiquetas_producto` (`producto_id`),
  KEY `idx_producto_etiquetas_etiqueta` (`etiqueta_id`),
  CONSTRAINT `producto_etiquetas_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `producto_etiquetas_ibfk_2` FOREIGN KEY (`etiqueta_id`) REFERENCES `etiquetas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `producto_etiquetas`
--

LOCK TABLES `producto_etiquetas` WRITE;
/*!40000 ALTER TABLE `producto_etiquetas` DISABLE KEYS */;
/*!40000 ALTER TABLE `producto_etiquetas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `productos`
--

DROP TABLE IF EXISTS `productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `organizacion_id` int NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text,
  `precio_unitario` decimal(10,2) NOT NULL,
  `costo_unitario` decimal(10,2) DEFAULT '0.00',
  `costo_promedio` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stock_actual` decimal(10,2) DEFAULT '0.00',
  `stock_minimo` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stock_maximo` decimal(10,2) NOT NULL DEFAULT '0.00',
  `ubicacion` varchar(100) DEFAULT NULL,
  `tipo` enum('Producto','Servicio') DEFAULT 'Producto',
  `unidad_medida` varchar(20) DEFAULT 'Unidad',
  `codigo_barras` varchar(50) DEFAULT NULL,
  `codigo_sku` varchar(50) DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `peso` decimal(10,2) DEFAULT NULL,
  `dimensiones` varchar(50) DEFAULT NULL,
  `imagen_url` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `categoria_id` int DEFAULT NULL,
  `marca_id` int DEFAULT NULL,
  `es_kit` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo_sku` (`codigo_sku`),
  KEY `organizacion_id` (`organizacion_id`),
  KEY `idx_productos_sku` (`codigo_sku`),
  KEY `idx_productos_nombre` (`nombre`),
  KEY `idx_productos_categoria` (`categoria_id`),
  KEY `idx_productos_marca` (`marca_id`),
  KEY `idx_productos_activo` (`activo`),
  CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `productos`
--

LOCK TABLES `productos` WRITE;
/*!40000 ALTER TABLE `productos` DISABLE KEYS */;
INSERT INTO `productos` VALUES (2,1,'Pago de Membresia','Producto de membresia',10.00,5.00,0.00,0.00,0.00,0.00,NULL,'Servicio','Unidad',NULL,NULL,'2026-07-19 22:04:37',NULL,NULL,NULL,1,NULL,NULL,0);
/*!40000 ALTER TABLE `productos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `proveedores`
--

DROP TABLE IF EXISTS `proveedores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proveedores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `organizacion_id` int NOT NULL,
  `razon_social` varchar(255) NOT NULL,
  `nombre_comercial` varchar(255) DEFAULT NULL,
  `tipo_documento` enum('NIT','DUI') NOT NULL DEFAULT 'NIT',
  `numero_documento` varchar(14) NOT NULL,
  `nrc` varchar(8) DEFAULT NULL,
  `id_departamento` varchar(2) NOT NULL,
  `id_municipio` varchar(2) NOT NULL,
  `direccion_linea` varchar(255) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `email_dte` varchar(100) DEFAULT NULL,
  `codigo_giro` varchar(5) NOT NULL,
  `tipo_contribuyente` enum('Grande','Mediano','Pequeño','Exento') NOT NULL DEFAULT 'Pequeño',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_documento_org` (`numero_documento`,`organizacion_id`),
  KEY `organizacion_id` (`organizacion_id`),
  KEY `id_departamento` (`id_departamento`,`id_municipio`),
  KEY `codigo_giro` (`codigo_giro`),
  CONSTRAINT `proveedores_ibfk_1` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `proveedores_ibfk_2` FOREIGN KEY (`id_departamento`, `id_municipio`) REFERENCES `municipios` (`id_departamento`, `id_municipio`),
  CONSTRAINT `proveedores_ibfk_3` FOREIGN KEY (`codigo_giro`) REFERENCES `actividades_economicas` (`codigo_giro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `proveedores`
--

LOCK TABLES `proveedores` WRITE;
/*!40000 ALTER TABLE `proveedores` DISABLE KEYS */;
/*!40000 ALTER TABLE `proveedores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saas_gastos_infraestructura`
--

DROP TABLE IF EXISTS `saas_gastos_infraestructura`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saas_gastos_infraestructura` (
  `id` int NOT NULL AUTO_INCREMENT,
  `organizacion_id` int DEFAULT '1',
  `proveedor` varchar(100) NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `descripcion` text,
  `fecha_gasto` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_gasto_organizacion` (`organizacion_id`),
  CONSTRAINT `fk_gasto_organizacion` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saas_gastos_infraestructura`
--

LOCK TABLES `saas_gastos_infraestructura` WRITE;
/*!40000 ALTER TABLE `saas_gastos_infraestructura` DISABLE KEYS */;
/*!40000 ALTER TABLE `saas_gastos_infraestructura` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saas_ingresos_membresias`
--

DROP TABLE IF EXISTS `saas_ingresos_membresias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saas_ingresos_membresias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `organizacion_id` int NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `mes_pagado` tinyint NOT NULL,
  `anio_pagado` int NOT NULL,
  `fecha_pago` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `descripcion` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `organizacion_id` (`organizacion_id`),
  CONSTRAINT `saas_ingresos_membresias_ibfk_1` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saas_ingresos_membresias`
--

LOCK TABLES `saas_ingresos_membresias` WRITE;
/*!40000 ALTER TABLE `saas_ingresos_membresias` DISABLE KEYS */;
/*!40000 ALTER TABLE `saas_ingresos_membresias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `organizacion_id` int DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `correo` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` enum('Admin','Vendedor','Contador','SUPER_ADMIN') DEFAULT 'Vendedor',
  `estado` enum('Activo','Inactivo') DEFAULT 'Activo',
  `password_temporal` tinyint(1) DEFAULT '0',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `correo` (`correo`),
  KEY `idx_usuarios_org` (`organizacion_id`),
  CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,1,'SuperAdmin','superadmin@localhost.com','$2b$10$wgjSORjigZ8/CINJQoiCLu3lR4M5o9VCFSwWx0eVpVgCdEiG/5N/C','SUPER_ADMIN','Activo',0,'2026-07-17 19:19:30'),(2,4,'prueba01','prueba01@gmail.com','$2b$10$D.xMKwZVn8NjMaQq1PtvQ.hYMgKQbWhZP8d7J2l7SODTOB/XfPKGq','Admin','Inactivo',0,'2026-07-17 19:19:30'),(3,NULL,'Walter Padilla','waly04padilla@gmail.com','$2b$10$yrGmKjB.FFwT2QMFSCVikefSzOaYA54GKPtHJsSUUJza6cyfH9oJC','SUPER_ADMIN','Inactivo',0,'2026-07-17 19:26:39'),(4,5,'Yadiel','prueba0102@gmail.com','$2b$10$g/XH6iQFL1WjOmPx.Rixd.4p2osDOFQJn1JP8RoTPBmN85fBA6dC2','Admin','Activo',0,'2026-07-18 05:15:29'),(5,5,'walter Padilla','walkag@gmail.com','$2b$10$jn2.fy6T7WHVcsgPJenGwu.0ddlokYxvC99u.kgcbe6mMRNg554mO','Contador','Activo',0,'2026-07-18 05:20:05'),(6,5,'juancho','ddfd@localhost.com','$2b$10$8wF/TdZeuO5nRKLCWtoVLOa1m.UASvU/noue1MdNjoOpDxyqRk2.u','Vendedor','Activo',0,'2026-07-18 08:55:49'),(7,6,'Juan Valdez','ddff@dospinos.com','$2b$10$QqcIGgWG4umR776Se.nnDuY4NDA.eV.CWvf3vs.9phPlp6T5otroO','Admin','Activo',0,'2026-07-19 03:15:42'),(8,6,'sdssdds','wlsj@gmail.com','$2b$10$/D1W/171i3epyrWqluSKYuy2.MSQGxAF24LDyy3CCuw6uYT/H58QC','Vendedor','Activo',0,'2026-07-19 05:17:05'),(9,2,'dhfhd','superl@gmil.com','$2b$10$8YejWISQCW7obaaNMGHaQu3LvRO7ohmrKmkUfigj5JdNse5/hIQz2','Vendedor','Activo',0,'2026-07-19 05:20:48'),(10,1,'Walter Padilla','mapate@dospinos.com','$2b$10$L1mnAJgbVIyfhsN5zh97q.tAKUqjj4vYW9ufE2YcjyCwRNgTe1xoa','SUPER_ADMIN','Activo',0,'2026-07-19 06:48:42');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-20 20:07:43
