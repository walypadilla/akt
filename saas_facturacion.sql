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
  PRIMARY KEY (`id`),
  UNIQUE KEY `dui` (`dui`),
  UNIQUE KEY `nit` (`nit`),
  KEY `idx_clientes_org` (`organizacion_id`),
  CONSTRAINT `clientes_ibfk_1` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes`
--

LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
INSERT INTO `clientes` VALUES (1,2,'CLIENTE MEMBRESÍA',NULL,'N/A',NULL,NULL,'Exento',NULL,NULL,NULL),(4,2,'Empresa de prueba',NULL,'0804-0123-101-4',NULL,NULL,'Exento',NULL,NULL,NULL),(5,4,'gffg',NULL,'0804-0123-101-6',NULL,NULL,'Exento',NULL,NULL,NULL),(6,5,'Empresa de prueba01',NULL,'0804-0123-101-7',NULL,NULL,'Exento',NULL,NULL,NULL);
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
  PRIMARY KEY (`id`),
  KEY `organizacion_id` (`organizacion_id`),
  CONSTRAINT `compras_gastos_ibfk_1` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones` (`id`) ON DELETE CASCADE
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuracion_saas`
--

LOCK TABLES `configuracion_saas` WRITE;
/*!40000 ALTER TABLE `configuracion_saas` DISABLE KEYS */;
INSERT INTO `configuracion_saas` VALUES (1,'Mi SaaS de Facturación','Facturacion SA','0000-000000-000-0','0000','San Salvador, El Salvador','0000-0000','info@misaas.com','','2026-07-17 23:12:50','2026-07-17 23:28:13');
/*!40000 ALTER TABLE `configuracion_saas` ENABLE KEYS */;
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
-- Table structure for table `facturas`
--

DROP TABLE IF EXISTS `facturas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `facturas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `organizacion_id` int NOT NULL,
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
  CONSTRAINT `facturas_ibfk_1` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `facturas_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `facturas_ibfk_3` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `facturas`
--

LOCK TABLES `facturas` WRITE;
/*!40000 ALTER TABLE `facturas` DISABLE KEYS */;
INSERT INTO `facturas` VALUES (5,4,2,5,'FAF','MEM-000001',90.00,0.00,11.70,0.00,0.00,0.00,101.70,'Anulada','2026-07-18 02:02:41',NULL),(6,5,4,6,'FAF','MEM-000001',80.00,0.00,10.40,0.00,0.00,0.00,90.40,'Anulada','2026-07-18 06:24:21',NULL),(7,5,4,6,'FAF','MEM-000002',60.00,0.00,7.80,0.00,0.00,0.00,67.80,'Anulada','2026-07-18 06:25:27',NULL),(8,4,2,5,'FAF','MEM-000002',90.00,0.00,11.70,0.00,0.00,0.00,101.70,'Pagada','2026-07-18 06:27:58',NULL),(9,2,1,4,'FAF','MEM-000001',12.00,0.00,1.56,0.00,0.00,0.00,13.56,'Emitida','2026-07-18 08:56:36',NULL);
/*!40000 ALTER TABLE `facturas` ENABLE KEYS */;
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `nit` (`nit`),
  UNIQUE KEY `nrc` (`nrc`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organizaciones`
--

LOCK TABLES `organizaciones` WRITE;
/*!40000 ALTER TABLE `organizaciones` DISABLE KEYS */;
INSERT INTO `organizaciones` VALUES (1,'SuperAdmin','0000-000000-000-0',NULL,'Exento','Activo','2026-07-17 15:56:43',NULL,NULL,NULL,NULL,NULL,NULL,'Pruebas',NULL,NULL,'Empresa Comercial'),(2,'Empresa de prueba','0804-0123-101-4','65739s','Mediano','Activo','2026-07-17 18:01:26','','Prueba SA de CV','Colonia Divina Providencia, BK Y Pasaje 7','71409012','71409012','','Pruebas',NULL,NULL,'Empresa Comercial'),(4,'gffg','0804-0123-101-9','65739f','Grande','Activo','2026-07-17 18:22:28','','Prueba SA de CVff','Colonia Divina Providencia, BK Y Pasaje 7','60490303','60490303',NULL,'Pruebas',NULL,NULL,'Empresa Comercial'),(5,'Empresa de prueba01','0804-0123-101-7','657397y','Pequeño','Activo','2026-07-18 05:15:28','','Prueba SA de CVffe','Colonia Divina Providencia, BK Y Pasaje 7, Numero 9','71409012','71409012',NULL,'Pruebas',NULL,NULL,'Empresa Comercial');
/*!40000 ALTER TABLE `organizaciones` ENABLE KEYS */;
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
-- Table structure for table `saas_gastos_infraestructura`
--

DROP TABLE IF EXISTS `saas_gastos_infraestructura`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saas_gastos_infraestructura` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proveedor` varchar(100) NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `descripcion` text,
  `fecha_gasto` date NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
  PRIMARY KEY (`id`),
  KEY `organizacion_id` (`organizacion_id`),
  CONSTRAINT `saas_ingresos_membresias_ibfk_1` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saas_ingresos_membresias`
--

LOCK TABLES `saas_ingresos_membresias` WRITE;
/*!40000 ALTER TABLE `saas_ingresos_membresias` DISABLE KEYS */;
INSERT INTO `saas_ingresos_membresias` VALUES (16,4,101.70,7,2026,'2026-07-18 08:32:29');
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,1,'SuperAdmin','superadmin@localhost.com','$2b$10$wgjSORjigZ8/CINJQoiCLu3lR4M5o9VCFSwWx0eVpVgCdEiG/5N/C','SUPER_ADMIN','Activo',0,'2026-07-17 19:19:30'),(2,4,'prueba01','prueba01@gmail.com','$2b$10$D.xMKwZVn8NjMaQq1PtvQ.hYMgKQbWhZP8d7J2l7SODTOB/XfPKGq','Admin','Activo',0,'2026-07-17 19:19:30'),(3,NULL,'Walter Padilla','waly04padilla@gmail.com','$2b$10$JVyJlfGnjAsw8Soona4Q5u0HANCLtPkjQjVRzf692pT8jNOZsGAli','SUPER_ADMIN','Activo',0,'2026-07-17 19:26:39'),(4,5,'Yadiel','prueba0102@gmail.com','$2b$10$g/XH6iQFL1WjOmPx.Rixd.4p2osDOFQJn1JP8RoTPBmN85fBA6dC2','Admin','Activo',0,'2026-07-18 05:15:29'),(5,5,'walter Padilla','walkag@gmail.com','$2b$10$KnnEywX7KRe7XJet3e3wwuA0b5XDagpgjs4LTbJUghXn7KOOMnK4G','Contador','Activo',0,'2026-07-18 05:20:05'),(6,5,'juancho','ddfd@localhost.com','$2b$10$8wF/TdZeuO5nRKLCWtoVLOa1m.UASvU/noue1MdNjoOpDxyqRk2.u','Vendedor','Activo',0,'2026-07-18 08:55:49');
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

-- Dump completed on 2026-07-18 15:13:57
