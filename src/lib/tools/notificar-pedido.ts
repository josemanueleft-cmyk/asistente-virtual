import type { ToolDefinition, ToolHandler } from "./index";
import { leadPhone } from "../airtable";
import { enviarAvisoDueno } from "../watchdog";

// Avisa al dueño (ALERT_WHATSAPP) al instante cuando hay un pedido confirmado
// o un comprobante de pago recibido. Reusa la conexión del watchdog: si no hay
// ALERT_WHATSAPP configurado, no revienta — solo queda registrado en el log.
interface NotificarPedidoArgs {
  resumenPedido?: string;
  metodoPago?: string;
  comprobanteRecibido?: boolean;
  entrega?: string;
  conversationId?: number;
}

export const notificarPedidoDefinition: ToolDefinition = {
  type: "function",
  function: {
    name: "notificarPedido",
    description:
      "Avisa AL INSTANTE al dueño del negocio por WhatsApp. Llámala en dos momentos: (1) en cuanto el cliente confirme un pedido (Paso 5 del flujo), con el resumen completo; (2) en cuanto el cliente mande o mencione que ya mandó el comprobante de una transferencia Nequi, aunque sea en un mensaje aparte del pedido. Puedes llamarla dos veces en la misma conversación si el pedido y el comprobante llegan en momentos distintos — no pasa nada, cada aviso es corto.",
    parameters: {
      type: "object",
      properties: {
        resumenPedido: {
          type: "string",
          description: "Qué pidió: producto, tamaño y toppings elegidos. Deja vacío si esta llamada es solo para avisar de un comprobante recién llegado, sin pedido nuevo que reportar.",
        },
        entrega: {
          type: "string",
          description: "'Recoger' o 'Domicilio'. Vacío si aún no se sabe.",
        },
        metodoPago: {
          type: "string",
          description: "'Efectivo' o 'Transferencia'. Vacío si aún no se sabe.",
        },
        comprobanteRecibido: {
          type: "boolean",
          description: "true si el cliente ya mandó o mencionó el comprobante de pago en esta llamada.",
        },
      },
      required: [],
    },
  },
};

export const notificarPedidoHandler: ToolHandler<NotificarPedidoArgs> = async (args) => {
  const phone = leadPhone(args.conversationId ?? 0);

  const lineas = [`🔔 Lunova — aviso de Luna`, `Cliente: ${phone}`];
  if (args.resumenPedido?.trim()) lineas.push(`Pedido: ${args.resumenPedido.trim()}`);
  if (args.entrega?.trim()) lineas.push(`Entrega: ${args.entrega.trim()}`);
  if (args.metodoPago?.trim()) lineas.push(`Pago: ${args.metodoPago.trim()}`);
  if (args.comprobanteRecibido) lineas.push(`✅ Comprobante de transferencia recibido — revísalo.`);

  const enviado = await enviarAvisoDueno(lineas.join("\n"));

  return {
    ok: true,
    avisado: enviado,
    message: enviado
      ? "Aviso enviado al dueño. Continúa la conversación con normalidad; no le digas al cliente que le avisaste a nadie."
      : "No se pudo enviar el aviso (falta ALERT_WHATSAPP configurado o el bot no está conectado). Continúa la conversación con normalidad; no menciones este fallo al cliente.",
  };
};
