import { XMLParser } from "fast-xml-parser";

// Endpoints del SRI (Servicio de Rentas Internas - Ecuador)
const ENDPOINTS = {
  pruebas: {
    recepcion: "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline",
    autorizacion: "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline",
  },
  produccion: {
    recepcion: "https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline",
    autorizacion: "https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline",
  },
};

export interface SriMensaje {
  identificador: string;
  mensaje: string;
  informacionAdicional?: string;
  tipo: string;
}

export interface RecepcionResult {
  estado: "RECIBIDA" | "DEVUELTA" | "ERROR";
  mensajes: SriMensaje[];
  rawResponse?: string;
}

export interface AutorizacionResult {
  estado: "AUTORIZADO" | "NO AUTORIZADO" | "EN PROCESO" | "ERROR";
  numeroAutorizacion?: string;
  fechaAutorizacion?: string;
  comprobanteXml?: string;
  mensajes: SriMensaje[];
  rawResponse?: string;
}

/**
 * Módulo cliente SOAP para interactuar con los Web Services del SRI de Ecuador de manera nativa sin dependencias pesadas.
 */
export class SriClient {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      trimValues: true,
      parseTagValue: false, // Mantener valores como strings para no truncar claves de acceso o secuencias
      removeNSPrefix: true, // Remover prefijos de namespaces (ej: "soapenv:", "ec:") para facilitar el acceso
    });
  }

  /**
   * Obtiene las URLs correspondientes según el ambiente seleccionado
   */
  private getEndpoints(ambiente: number) {
    return ambiente === 2 ? ENDPOINTS.produccion : ENDPOINTS.pruebas;
  }

  /**
   * Envía una factura firmada codificada en Base64 al servicio de Recepción del SRI
   */
  async validarComprobante(xmlSignedBase64: string, ambiente: number): Promise<RecepcionResult> {
    const urls = this.getEndpoints(ambiente);
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.recepcion">
   <soapenv:Header/>
   <soapenv:Body>
      <ec:validarComprobante>
         <xml>${xmlSignedBase64}</xml>
      </ec:validarComprobante>
   </soapenv:Body>
</soapenv:Envelope>`;

    try {
      const response = await fetch(urls.recepcion, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml;charset=utf-8",
        },
        body: soapEnvelope,
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      return this.parseRecepcionResponse(text);
    } catch (error: any) {
      return {
        estado: "ERROR",
        mensajes: [{
          identificador: "ERR_SOAP_CLIENT",
          mensaje: `Error de conexión con el servicio de Recepción del SRI: ${error.message || error}`,
          tipo: "ERROR",
        }],
      };
    }
  }

  /**
   * Consulta el estado de autorización de un comprobante mediante su clave de acceso
   */
  async autorizacionComprobante(claveAcceso: string, ambiente: number): Promise<AutorizacionResult> {
    const urls = this.getEndpoints(ambiente);
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.autorizacion">
   <soapenv:Header/>
   <soapenv:Body>
      <ec:autorizacionComprobante>
         <claveAccesoComprobante>${claveAcceso}</claveAccesoComprobante>
      </ec:autorizacionComprobante>
   </soapenv:Body>
</soapenv:Envelope>`;

    try {
      const response = await fetch(urls.autorizacion, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml;charset=utf-8",
        },
        body: soapEnvelope,
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      return this.parseAutorizacionResponse(text);
    } catch (error: any) {
      return {
        estado: "ERROR",
        mensajes: [{
          identificador: "ERR_SOAP_CLIENT",
          mensaje: `Error de conexión con el servicio de Autorización del SRI: ${error.message || error}`,
          tipo: "ERROR",
        }],
      };
    }
  }

  /**
   * Parsea la respuesta XML de Recepción del SRI
   */
  private parseRecepcionResponse(xmlText: string): RecepcionResult {
    const jsonObj = this.parser.parse(xmlText);
    
    const body = jsonObj?.Envelope?.Body;
    const response = body?.validarComprobanteResponse?.RespuestaRecepcionComprobante;

    if (!response) {
      return {
        estado: "ERROR",
        mensajes: [{
          identificador: "ERR_PARSE_RECEPTION",
          mensaje: "La estructura de la respuesta de Recepción del SRI no es válida o está vacía.",
          tipo: "ERROR",
        }],
        rawResponse: xmlText,
      };
    }

    const estado = response.estado as "RECIBIDA" | "DEVUELTA";
    const mensajesList: SriMensaje[] = [];

    const comprobantes = response.comprobantes;
    if (comprobantes && comprobantes.comprobante) {
      const compArray = Array.isArray(comprobantes.comprobante)
        ? comprobantes.comprobante
        : [comprobantes.comprobante];

      for (const comp of compArray) {
        const mensajes = comp.mensajes;
        if (mensajes && mensajes.mensaje) {
          const msgArray = Array.isArray(mensajes.mensaje)
            ? mensajes.mensaje
            : [mensajes.mensaje];

          for (const m of msgArray) {
            mensajesList.push({
              identificador: m.identificador || "",
              mensaje: m.mensaje || "",
              informacionAdicional: m.informacionAdicional || undefined,
              tipo: m.tipo || "ERROR",
            });
          }
        }
      }
    }

    return {
      estado,
      mensajes: mensajesList,
      rawResponse: xmlText,
    };
  }

  /**
   * Parsea la respuesta XML de Autorización del SRI
   */
  private parseAutorizacionResponse(xmlText: string): AutorizacionResult {
    const jsonObj = this.parser.parse(xmlText);
    
    const body = jsonObj?.Envelope?.Body;
    const response = body?.autorizacionComprobanteResponse?.RespuestaAutorizacionComprobante;

    if (!response) {
      return {
        estado: "ERROR",
        mensajes: [{
          identificador: "ERR_PARSE_AUTHORIZATION",
          mensaje: "La estructura de la respuesta de Autorización del SRI no es válida o está vacía.",
          tipo: "ERROR",
        }],
        rawResponse: xmlText,
      };
    }

    const autorizaciones = response.autorizaciones;
    if (!autorizaciones || !autorizaciones.autorizacion) {
      return {
        estado: "NO AUTORIZADO",
        mensajes: [{
          identificador: "ERR_NO_AUTORIZACIONES",
          mensaje: "No se encontraron autorizaciones para esta clave de acceso en el SRI.",
          tipo: "ERROR",
        }],
        rawResponse: xmlText,
      };
    }

    const aut = Array.isArray(autorizaciones.autorizacion)
      ? autorizaciones.autorizacion[0]
      : autorizaciones.autorizacion;

    const estado = aut.estado as "AUTORIZADO" | "NO AUTORIZADO" | "EN PROCESO";
    const numeroAutorizacion = aut.numeroAutorizacion;
    const fechaAutorizacion = aut.fechaAutorizacion;
    const comprobanteXml = aut.comprobante;

    const mensajesList: SriMensaje[] = [];
    const mensajes = aut.mensajes;
    if (mensajes && mensajes.mensaje) {
      const msgArray = Array.isArray(mensajes.mensaje)
        ? mensajes.mensaje
        : [mensajes.mensaje];

      for (const m of msgArray) {
        mensajesList.push({
          identificador: m.identificador || "",
          mensaje: m.mensaje || "",
          informacionAdicional: m.informacionAdicional || undefined,
          tipo: m.tipo || "ERROR",
        });
      }
    }

    return {
      estado,
      numeroAutorizacion,
      fechaAutorizacion,
      comprobanteXml,
      mensajes: mensajesList,
      rawResponse: xmlText,
    };
  }
}
