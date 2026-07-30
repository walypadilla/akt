// backend/src/helpers/dteJsonBuilder.js
const { generarUUID } = require('./uuidHelper');

class DTEJsonBuilder {
  /**
   * Construir el JSON para el DTE según la estructura del MH
   * @param {Object} factura - Datos de la factura
   * @param {Array} detalles - Detalles de la factura
   * @param {Object} organizacion - Datos de la organización
   * @param {Object} cliente - Datos del cliente
   * @param {string} numeroControl - Número de control generado
   * @returns {Object} - JSON del DTE
   */
  static build(factura, detalles, organizacion, cliente, numeroControl) {
    const codigoGeneracion = generarUUID();
    const fechaEmision = new Date(factura.creado_en);
    const fechaStr = fechaEmision.toISOString().split('T')[0];
    const horaStr = fechaEmision.toTimeString().split(' ')[0];

    // Mapear tipo de documento
    const tipoDteMap = {
      'FAF': '01',  // Factura
      'CCF': '03',  // Comprobante de Crédito Fiscal
      'FSE': '14',  // Factura Sujeto Excluido
    };

    // Mapear condición de operación
    const condicionMap = {
      'Contado': 1,
      'Credito': 2,
    };

    // Mapear forma de pago (CAT-017)
    const formaPagoMap = {
      'Efectivo': '01',
      'Tarjeta Débito/Crédito': '03', // Usamos 03 para crédito
      'Transferencia Bancaria': '05',
      'Cheque': '04',
      'Otro': '99',
    };

    // Construir ítems del cuerpo del documento
    const items = detalles.map((d, index) => {
      const subtotal = parseFloat(d.subtotal) || 0;
      const iva = parseFloat(d.iva) || 0;
      const precioUnitario = parseFloat(d.precio_unitario) || 0;
      const cantidad = parseFloat(d.cantidad) || 0;

      // Determinar si es gravado, exento o no sujeto
      let ventaGravada = 0;
      let ventaExenta = 0;
      let ventaNoSujeta = 0;
      let tributos = [];

      if (d.tipo_venta === 'Gravado') {
        ventaGravada = subtotal;
        tributos = ['20']; // IVA 13%
      } else if (d.tipo_venta === 'Exento') {
        ventaExenta = subtotal;
        tributos = ['C3']; // IVA 0% (exportaciones)
      } else if (d.tipo_venta === 'No_Sujeto') {
        ventaNoSujeta = subtotal;
        tributos = [];
      }

      // Unidad de medida (CAT-014)
      const unidadMedida = d.unidad_medida || '59';

      return {
        numItem: index + 1,
        tipoItem: 1, // 1 = Bienes, 2 = Servicios, 3 = Ambos
        numeroDocumento: null,
        codigo: d.codigo_sku || null,
        codTributo: null,
        descripcion: d.producto_nombre || 'Producto',
        cantidad: cantidad,
        uniMedida: unidadMedida,
        precioUni: precioUnitario,
        montoDescu: parseFloat(d.descuento_item) || 0,
        ventaNoSuj: ventaNoSujeta,
        ventaExenta: ventaExenta,
        ventaGravada: ventaGravada,
        tributos: tributos,
        psv: 0,
        noGravado: 0,
      };
    });

    // Calcular totales
    const totalGravada = items.reduce((sum, i) => sum + i.ventaGravada, 0);
    const totalExenta = items.reduce((sum, i) => sum + i.ventaExenta, 0);
    const totalNoSuj = items.reduce((sum, i) => sum + i.ventaNoSuj, 0);
    const subTotalVentas = totalGravada + totalExenta + totalNoSuj;

    const descuentoGlobal = parseFloat(factura.descuento) || 0;
    const iva13 = parseFloat(factura.iva_13) || 0;
    const retencion1 = parseFloat(factura.retencion_1) || 0;
    const percepcion1 = parseFloat(factura.percepcion_1) || 0;
    const totalPagar = parseFloat(factura.total_pagar) || 0;

    // Determinar forma de pago
    let medioPago = factura.medio_pago;
    if (typeof medioPago === 'string') {
      try { medioPago = JSON.parse(medioPago); } catch { medioPago = [medioPago]; }
    }
    if (!Array.isArray(medioPago) || medioPago.length === 0) {
      medioPago = ['Efectivo'];
    }

    // Construir objeto de pago
    const formaPago = medioPago.map(mp => ({
      codigo: formaPagoMap[mp] || '01',
      montoPago: totalPagar,
      plazo: null,
      referencia: null,
      periodo: null,
    }));

    // Construir JSON final
    return {
      identificacion: {
        version: 2,
        ambiente: organizacion.ambiente || '00',
        tipoDte: tipoDteMap[factura.tipo_documento] || '01',
        numeroControl: numeroControl,
        codigoGeneracion: codigoGeneracion,
        tipoModelo: 1, // 1 = Modelo previo
        tipoOperacion: 1, // 1 = Transmisión normal
        tipoContingencia: null,
        motivoContin: null,
        fecEmi: fechaStr,
        horEmi: horaStr,
        tipoMoneda: 'USD',
      },
      documentoRelacionado: null,
      emisor: {
        nit: organizacion.nit ? organizacion.nit.replace(/-/g, '') : '',
        nrc: organizacion.nrc || '',
        nombre: organizacion.nombre_empresa || '',
        codActividad: organizacion.codigo_giro || '62010',
        descActividad: 'Desarrollo de sistemas informáticos',
        nombreComercial: organizacion.nombre_comercial || '',
        tipoEstablecimiento: '02', // 02 = Casa Matriz
        direccion: {
          departamento: organizacion.id_departamento || '06',
          municipio: organizacion.id_municipio || '14',
          complemento: organizacion.direccion_linea || '',
          telefono: organizacion.telefono || '',
          correo: organizacion.correo_contacto || '',
          codEstableMH: null,
          codEstable: null,
          codPuntoVentaMH: null,
          codPuntoVenta: null,
        },
      },
      receptor: {
        nit: cliente.nit ? cliente.nit.replace(/-/g, '') : '',
        nrc: cliente.nrc || '',
        nombre: cliente.nombre || 'Consumidor Final',
        codActividad: cliente.giro || '10005',
        descActividad: 'Otros',
        nombreComercial: null,
        direccion: {
          departamento: cliente.id_departamento || '06',
          municipio: cliente.id_municipio || '14',
          complemento: cliente.direccion_linea || '',
          telefono: cliente.telefono || '',
          correo: cliente.correo || '',
        },
      },
      otrosDocumentos: null,
      ventaTercero: null,
      cuerpoDocumento: items,
      resumen: {
        totalNoSuj: totalNoSuj,
        totalExenta: totalExenta,
        totalGravada: totalGravada,
        subTotalVentas: subTotalVentas,
        descuNoSuj: 0,
        descuExenta: 0,
        descuGravada: descuentoGlobal,
        porcentajeDescuento: 0,
        totalDescu: descuentoGlobal,
        tributos: iva13 > 0 ? [{
          codigo: '20',
          descripcion: 'Impuesto al Valor Agregado 13%',
          valor: iva13,
        }] : [],
        subTotal: subTotalVentas - descuentoGlobal,
        ivaPerci1: percepcion1,
        ivaRete1: retencion1,
        reteRenta: 0,
        montoTotalOperacion: totalPagar + retencion1 - percepcion1,
        totalNoGravado: 0,
        totalPagar: totalPagar,
        totalLetras: this.numeroALetras(totalPagar),
        saldoFavor: 0,
        condicionOperacion: condicionMap[factura.condicion_operacion] || 1,
        pagos: formaPago,
        numPagoElectronico: null,
      },
      extension: {
        nombEntrega: null,
        docuEntrega: null,
        nombRecibe: null,
        docuRecibe: null,
        observaciones: factura.observaciones || null,
        placaVehiculo: null,
      },
      apendice: null,
    };
  }

  /**
   * Convertir número a letras
   */
  static numeroALetras(num) {
    const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    const decenas = ['', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    if (num === 0) return 'CERO';

    const numStr = num.toFixed(2);
    const partes = numStr.split('.');
    const entero = parseInt(partes[0]);
    const decimal = parseInt(partes[1]);

    let resultado = '';

    // Miles
    const miles = Math.floor(entero / 1000);
    const resto = entero % 1000;
    if (miles > 0) {
      resultado += (miles === 1 ? 'MIL' : this.numeroALetras(miles) + ' MIL');
      if (resto > 0) resultado += ' ';
    }

    // Centenas, decenas, unidades
    if (resto > 0) {
      const c = Math.floor(resto / 100);
      const d = Math.floor((resto % 100) / 10);
      const u = resto % 10;

      if (c > 0) {
        if (c === 1 && resto % 100 === 0) resultado += 'CIEN';
        else resultado += centenas[c];
        if (resto % 100 > 0) resultado += ' ';
      }

      if (d > 0) {
        if (d === 1 && u > 0) {
          resultado += especiales[u];
        } else {
          if (d === 2 && u > 0) {
            resultado += 'VEINTI' + unidades[u];
          } else {
            resultado += decenas[d - 1];
            if (u > 0) resultado += ' Y ' + unidades[u];
          }
        }
      } else if (u > 0) {
        resultado += unidades[u];
      }
    }

    resultado += ` CON ${decimal.toString().padStart(2, '0')}/100`;
    return resultado;
  }
}

module.exports = DTEJsonBuilder;