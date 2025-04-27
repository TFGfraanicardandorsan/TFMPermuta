export const markupAceptarRechazarUsuario = (uvus) => { 
    return {
      inline_keyboard: [
        [
          {
            text: "Aceptar",
            callback_data: `aceptar_${uvus}`
          },
          {
            text: "Rechazar",
            callback_data: `rechazar_${uvus}`
          }
        ]
      ]
    };
  };
  