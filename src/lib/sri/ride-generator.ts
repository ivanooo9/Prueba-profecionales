import PDFDocument from "pdfkit";

interface RideInvoiceData {
  secuencial: string;
  establecimiento: string;
  puntoEmision: string;
  claveAcceso: string;
  numeroAutorizacion?: string;
  fechaAutorizacion?: string;
  ambiente: number;
  tipoEmision: string;
  fechaEmision: string;
  formaPagoText: string;
  subtotal0: number;
  subtotalIva: number;
  valorIva: number;
  ivaPercentage: number;
  total: number;
  
  emisor: {
    ruc: string;
    razonSocial: string;
    nombreComercial: string;
    direccionMatriz: string;
    direccionEstablecimiento: string;
    obligadoContabilidad: boolean;
    regimen?: string | null;
    logo?: string | null;
  };
  
  comprador: {
    nombres: string;
    identificacion: string;
    tipoIdentificacion: string;
    direccion: string;
    email: string;
  };

  items: Array<{
    codigoPrincipal: string;
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    total: number;
  }>;
}

/**
 * Genera un PDF en formato Buffer que representa el RIDE de la Factura
 */
export function generateRidePdf(data: RideInvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 30 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    // Estilos de colores (Premium & Minimalistas)
    const primaryColor = "#1e293b"; // Slate 800
    const secondaryColor = "#475569"; // Slate 600
    const lightGray = "#f1f5f9"; // Slate 100
    const borderGray = "#cbd5e1"; // Slate 300

    // --- ENCABEZADO ---
    let startY = 40;
    if (data.emisor.logo) {
      try {
        const base64Data = data.emisor.logo.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, "base64");
        doc.image(imageBuffer, 30, 35, { fit: [120, 50] });
        startY = 95;
      } catch (logoErr) {
        console.error("Error al pintar el logo en el PDF:", logoErr);
      }
    }

    doc.fillColor(primaryColor).fontSize(11).font("Helvetica-Bold");
    doc.text(data.emisor.razonSocial.toUpperCase(), 30, startY, { width: 250 });
    
    if (data.emisor.nombreComercial) {
      doc.fontSize(9).font("Helvetica-Oblique").fillColor(secondaryColor);
      doc.text(data.emisor.nombreComercial, 30, doc.y + 2, { width: 250 });
    }

    doc.fontSize(7.5).font("Helvetica").fillColor(secondaryColor);
    doc.text(`Dirección Matriz: ${data.emisor.direccionMatriz}`, 30, doc.y + 6, { width: 250 });
    doc.text(`Dirección Sucursal: ${data.emisor.direccionEstablecimiento || data.emisor.direccionMatriz}`, 30, doc.y + 3, { width: 250 });
    doc.text(`Obligado a llevar contabilidad: ${data.emisor.obligadoContabilidad ? "SI" : "NO"}`, 30, doc.y + 3);
    
    if (data.emisor.regimen) {
      doc.text(`Contribuyente régimen: ${data.emisor.regimen}`, 30, doc.y + 3);
    }

    // Columna Derecha: Cuadro de Facturación / Datos del SRI
    const rightColX = 300;
    doc.rect(rightColX, 35, 265, 180).strokeColor(borderGray).lineWidth(1).stroke();
    
    doc.fillColor(primaryColor).fontSize(10).font("Helvetica-Bold");
    doc.text(`R.U.C.: ${data.emisor.ruc}`, rightColX + 10, 45);
    
    doc.fontSize(12).text("F A C T U R A", rightColX + 10, doc.y + 5);
    doc.fontSize(9).font("Helvetica");
    doc.text(`No.: ${data.establecimiento.padStart(3, "0")}-${data.puntoEmision.padStart(3, "0")}-${data.secuencial.padStart(9, "0")}`, rightColX + 10, doc.y + 2);
    
    doc.font("Helvetica-Bold").text(`NÚMERO DE AUTORIZACIÓN:`, rightColX + 10, doc.y + 10);
    doc.fontSize(7).font("Helvetica").text(data.numeroAutorizacion || data.claveAcceso || "PENDIENTE", rightColX + 10, doc.y + 2, { width: 245 });
    
    doc.fontSize(8);
    doc.text(`FECHA Y HORA DE AUTORIZACIÓN: ${data.fechaAutorizacion || "NO AUTORIZADO"}`, rightColX + 10, doc.y + 5);
    doc.text(`AMBIENTE: ${data.ambiente === 2 ? "PRODUCCIÓN" : "PRUEBAS"}`, rightColX + 10, doc.y + 5);
    doc.text(`EMISIÓN: ${data.tipoEmision === "1" ? "NORMAL" : "NORMAL"}`, rightColX + 10, doc.y + 5);
    
    doc.fontSize(8).font("Helvetica-Bold");
    doc.text(`CLAVE DE ACCESO:`, rightColX + 10, doc.y + 8);
    doc.rect(rightColX + 10, doc.y + 2, 245, 12).fill(primaryColor);
    doc.fillColor(primaryColor).fontSize(6).font("Helvetica").text(data.claveAcceso, rightColX + 10, doc.y + 16, { width: 245, align: "center" });

    // --- INFORMACIÓN DEL COMPRADOR ---
    const clientY = 230;
    doc.rect(30, clientY, 535, 60).strokeColor(borderGray).lineWidth(1).stroke();
    
    doc.fillColor(primaryColor).fontSize(8).font("Helvetica-Bold");
    doc.text(`Razón Social / Nombres y Apellidos:`, 40, clientY + 8);
    doc.font("Helvetica").text(data.comprador.nombres, 185, clientY + 8, { width: 360 });

    doc.font("Helvetica-Bold").text(`Identificación:`, 40, clientY + 22);
    doc.font("Helvetica").text(data.comprador.identificacion, 110, clientY + 22);

    doc.font("Helvetica-Bold").text(`Fecha Emisión:`, 280, clientY + 22);
    doc.font("Helvetica").text(data.fechaEmision, 350, clientY + 22);

    doc.font("Helvetica-Bold").text(`Dirección:`, 40, clientY + 36);
    doc.font("Helvetica").text(data.comprador.direccion || "N/A", 110, clientY + 36, { width: 250 });

    doc.font("Helvetica-Bold").text(`Email:`, 370, clientY + 36);
    doc.font("Helvetica").text(data.comprador.email, 405, clientY + 36, { width: 150 });

    // --- TABLA DE ITEMS ---
    const tableTop = 305;
    
    doc.rect(30, tableTop, 535, 20).fill(primaryColor);
    doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold");
    doc.text("Cod. Principal", 35, tableTop + 6, { width: 70 });
    doc.text("Cantidad", 110, tableTop + 6, { width: 50, align: "right" });
    doc.text("Descripción", 170, tableTop + 6, { width: 170 });
    doc.text("P. Unitario", 350, tableTop + 6, { width: 60, align: "right" });
    doc.text("Descuento", 420, tableTop + 6, { width: 60, align: "right" });
    doc.text("Precio Total", 490, tableTop + 6, { width: 70, align: "right" });

    let currentY = tableTop + 20;
    doc.fillColor(primaryColor).font("Helvetica");

    data.items.forEach((item, index) => {
      if (index % 2 === 1) {
        doc.rect(30, currentY, 535, 18).fill(lightGray);
      }
      doc.fillColor(primaryColor);
      
      doc.text(item.codigoPrincipal, 35, currentY + 5, { width: 70 });
      doc.text(item.cantidad.toFixed(2), 110, currentY + 5, { width: 50, align: "right" });
      doc.text(item.nombre, 170, currentY + 5, { width: 170 });
      doc.text(item.precioUnitario.toFixed(2), 350, currentY + 5, { width: 60, align: "right" });
      doc.text(item.descuento.toFixed(2), 420, currentY + 5, { width: 60, align: "right" });
      doc.text(item.total.toFixed(2), 490, currentY + 5, { width: 70, align: "right" });

      doc.moveTo(30, currentY + 18).lineTo(565, currentY + 18).strokeColor(borderGray).lineWidth(0.5).stroke();
      currentY += 18;
    });

    // --- INFORMACIÓN ADICIONAL Y TOTALES ---
    const infoY = currentY + 15;
    
    doc.rect(30, infoY, 260, 95).strokeColor(borderGray).lineWidth(1).stroke();
    doc.fillColor(primaryColor).fontSize(8).font("Helvetica-Bold");
    doc.text("INFORMACIÓN ADICIONAL", 40, infoY + 8);
    
    doc.font("Helvetica").fontSize(7);
    doc.text(`Email Comprador: ${data.comprador.email}`, 40, infoY + 22, { width: 240 });
    doc.text(`Dirección Comprador: ${data.comprador.direccion || "N/A"}`, 40, doc.y + 4, { width: 240 });
    
    doc.font("Helvetica-Bold").fontSize(8).text("DETALLE DE PAGOS", 40, infoY + 50);
    doc.font("Helvetica").fontSize(7);
    doc.text(`Forma de Pago: ${data.formaPagoText}`, 40, infoY + 62, { width: 240 });
    doc.text(`Plazo: 1 días`, 40, doc.y + 4);

    const totalsX = 300;
    let totalsY = currentY + 15;

    const drawTotalRow = (label: string, value: number, isBold: boolean = false) => {
      doc.rect(totalsX, totalsY, 265, 15).strokeColor(borderGray).lineWidth(0.5).stroke();
      doc.fillColor(primaryColor).fontSize(7).font(isBold ? "Helvetica-Bold" : "Helvetica");
      doc.text(label, totalsX + 10, totalsY + 4, { width: 150 });
      doc.text(value.toFixed(2), totalsX + 170, totalsY + 4, { width: 85, align: "right" });
      totalsY += 15;
    };

    drawTotalRow(`SUBTOTAL ${data.ivaPercentage}%`, data.subtotalIva);
    drawTotalRow("SUBTOTAL 0%", data.subtotal0);
    drawTotalRow("SUBTOTAL NO OBJETO DE IVA", 0.00);
    drawTotalRow("SUBTOTAL EXENTO DE IVA", 0.00);
    drawTotalRow("SUBTOTAL SIN IMPUESTOS", data.subtotalIva + data.subtotal0);
    drawTotalRow("TOTAL DESCUENTO", data.items.reduce((acc, item) => acc + item.descuento, 0));
    drawTotalRow(`IVA ${data.ivaPercentage}%`, data.valorIva);
    drawTotalRow("PROPINA", 0.00);
    drawTotalRow("VALOR TOTAL", data.total, true);

    doc.end();
  });
}
