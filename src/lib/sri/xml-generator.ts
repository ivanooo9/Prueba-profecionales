import { generateClaveAcceso } from "./sri-utils";

interface XmlInvoiceItem {
  nombre: string;
  codigoPrincipal: string;
  descripcion?: string | null;
  precioUnitario: number;
  cantidad: number;
  descuento: number;
  ivaPercentage: number; // 0, 12, 15, etc.
}

interface XmlInvoiceData {
  secuencial: string;
  ambiente: number; // 1 = Pruebas, 2 = Producción
  establecimiento: string;
  puntoEmision: string;
  fechaEmision: Date;
  formaPago: string; // ej: "01"
  
  // Emisor
  emisor: {
    ruc: string;
    razonSocial: string;
    nombreComercial: string;
    direccionMatriz: string;
    direccionEstablecimiento: string;
    obligadoContabilidad: boolean;
    regimen?: string | null;
  };
  
  comprador: {
    nombres: string;
    tipoIdentificacion: string;
    identificacion: string;
    direccion: string;
    email: string;
  };
  
  items: XmlInvoiceItem[];
  pagos?: Array<{
    formaPago: string;
    total: number;
    plazo?: number;
    unidadTiempo?: string;
  }>;
}

function getIvaCode(percentage: number): string {
  if (percentage === 0) return "0";
  if (percentage === 5) return "5";
  if (percentage === 8) return "8";
  if (percentage === 12) return "2";
  if (percentage === 13) return "10";
  if (percentage === 14) return "3";
  if (percentage === 15) return "4";
  if (percentage === -1 || percentage === 6) return "6"; // NO OBJETO DE IMP.
  if (percentage === -2 || percentage === 7) return "7"; // EXENTO IVA
  return "2"; // Default a 12%
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function generateInvoiceXml(data: XmlInvoiceData): { xml: string; claveAcceso: string } {
  // 1. Generar la clave de acceso de 49 dígitos
  const claveAcceso = generateClaveAcceso({
    fecha: data.fechaEmision,
    tipoComprobante: "01", // 01 = Factura
    ruc: data.emisor.ruc,
    ambiente: data.ambiente,
    establecimiento: data.establecimiento,
    puntoEmision: data.puntoEmision,
    secuencial: data.secuencial,
  });

  // 2. Calcular los totales de la factura
  let totalSinImpuestos = 0;
  let totalDescuento = 0;
  
  const impuestosAgrupados: {
    [key: number]: { baseImponible: number; valor: number; ivaPercentage: number };
  } = {};

  const xmlItems = data.items.map((item) => {
    const totalItemSinImpuesto = item.precioUnitario * item.cantidad;
    const itemDescuento = item.descuento || 0;
    const baseImponible = totalItemSinImpuesto - itemDescuento;
    const valorIva = baseImponible * (item.ivaPercentage > 0 ? item.ivaPercentage / 100 : 0);

    totalSinImpuestos += baseImponible;
    totalDescuento += itemDescuento;

    if (!impuestosAgrupados[item.ivaPercentage]) {
      impuestosAgrupados[item.ivaPercentage] = {
        baseImponible: 0,
        valor: 0,
        ivaPercentage: item.ivaPercentage,
      };
    }
    impuestosAgrupados[item.ivaPercentage].baseImponible += baseImponible;
    impuestosAgrupados[item.ivaPercentage].valor += valorIva;

    const codePorcentaje = getIvaCode(item.ivaPercentage);

    return `
    <detalle>
      <codigoPrincipal>${escapeXml(item.codigoPrincipal)}</codigoPrincipal>
      <descripcion>${escapeXml(item.nombre)}</descripcion>
      <cantidad>${item.cantidad.toFixed(2)}</cantidad>
      <precioUnitario>${item.precioUnitario.toFixed(6)}</precioUnitario>
      <descuento>${itemDescuento.toFixed(2)}</descuento>
      <precioTotalSinImpuesto>${baseImponible.toFixed(2)}</precioTotalSinImpuesto>
      <impuestos>
        <impuesto>
          <codigo>2</codigo> <!-- 2 = IVA -->
          <codigoPorcentaje>${codePorcentaje}</codigoPorcentaje>
          <tarifa>${item.ivaPercentage.toFixed(2)}</tarifa>
          <baseImponible>${baseImponible.toFixed(2)}</baseImponible>
          <valor>${valorIva.toFixed(2)}</valor>
        </impuesto>
      </impuestos>
    </detalle>`;
  });

  let totalImpuestosVal = 0;
  Object.values(impuestosAgrupados).forEach((imp) => {
    totalImpuestosVal += imp.valor;
  });
  const importeTotal = totalSinImpuestos + totalImpuestosVal;

  const d = data.fechaEmision;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear());
  const fechaEmisionStr = `${day}/${month}/${year}`;

  const obligadoLlevarContabilidad = data.emisor.obligadoContabilidad ? "SI" : "NO";

  const xmlTotalConImpuestos = Object.values(impuestosAgrupados)
    .map((imp) => {
      const codePorcentaje = getIvaCode(imp.ivaPercentage);
      return `
      <totalImpuesto>
        <codigo>2</codigo> <!-- 2 = IVA -->
        <codigoPorcentaje>${codePorcentaje}</codigoPorcentaje>
        <baseImponible>${imp.baseImponible.toFixed(2)}</baseImponible>
        <valor>${imp.valor.toFixed(2)}</valor>
      </totalImpuesto>`;
    })
    .join("");

  let xmlPagos = "";
  if (data.pagos && Array.isArray(data.pagos) && data.pagos.length > 0) {
    xmlPagos = data.pagos
      .map((p) => `
      <pago>
        <formaPago>${p.formaPago}</formaPago>
        <total>${parseFloat(p.total as any).toFixed(2)}</total>
        <plazo>${p.plazo || 1}</plazo>
        <unidadTiempo>${p.unidadTiempo || "dias"}</unidadTiempo>
      </pago>`)
      .join("");
  } else {
    xmlPagos = `
      <pago>
        <formaPago>${data.formaPago}</formaPago>
        <total>${importeTotal.toFixed(2)}</total>
        <plazo>1</plazo>
        <unidadTiempo>dias</unidadTiempo>
      </pago>`;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="1.0.0">
  <infoTributaria>
    <ambiente>${data.ambiente}</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>${escapeXml(data.emisor.razonSocial)}</razonSocial>
    <nombreComercial>${escapeXml(data.emisor.nombreComercial || data.emisor.razonSocial)}</nombreComercial>
    <ruc>${data.emisor.ruc}</ruc>
    <claveAcceso>${claveAcceso}</claveAcceso>
    <codDoc>01</codDoc>
    <estab>${data.establecimiento.padStart(3, "0")}</estab>
    <ptoEmi>${data.puntoEmision.padStart(3, "0")}</ptoEmi>
    <secuencial>${data.secuencial.padStart(9, "0")}</secuencial>
    <dirMatriz>${escapeXml(data.emisor.direccionMatriz)}</dirMatriz>
  </infoTributaria>
  <infoFactura>
    <fechaEmision>${fechaEmisionStr}</fechaEmision>
    <dirEstablecimiento>${escapeXml(data.emisor.direccionEstablecimiento || data.emisor.direccionMatriz)}</dirEstablecimiento>
    <obligadoContabilidad>${obligadoLlevarContabilidad}</obligadoContabilidad>
    <tipoIdentificacionComprador>${data.comprador.tipoIdentificacion}</tipoIdentificacionComprador>
    <razonSocialComprador>${escapeXml(data.comprador.nombres)}</razonSocialComprador>
    <identificacionComprador>${data.comprador.identificacion}</identificacionComprador>
    <totalSinImpuestos>${totalSinImpuestos.toFixed(2)}</totalSinImpuestos>
    <totalDescuento>${totalDescuento.toFixed(2)}</totalDescuento>
    <totalConImpuestos>${xmlTotalConImpuestos}
    </totalConImpuestos>
    <propina>0.00</propina>
    <importeTotal>${importeTotal.toFixed(2)}</importeTotal>
    <moneda>DOLAR</moneda>
    <pagos>${xmlPagos}</pagos>
  </infoFactura>
  <detalles>${xmlItems.join("")}
  </detalles>
  <infoAdicional>
    <campoAdicional nombre="Email">${escapeXml(data.comprador.email)}</campoAdicional>
  </infoAdicional>
</factura>`;

  return { xml: xml.trim(), claveAcceso };
}
