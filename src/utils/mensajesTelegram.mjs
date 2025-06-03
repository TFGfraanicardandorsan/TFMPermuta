export const mensajeValidacionPermuta = `
🎉 La permuta ha sido confirmada por todas las partes involucradas en la solicitud de permuta, por lo que ya está listo el documento de solicitud que debes presentar firmado por Registro Electrónico de la Universidad de Sevilla. Recuerda que sin este último paso de presentación de la documentación por Registro Electrónico, la solicitud de permuta no se tramita y no es recibida por la Escuela. Por tanto, ahora debéis seguir los siguientes pasos:

1. Vais al registro general con este enlace (https://reg.redsara.es/).
2. Creáis un nuevo registro.
3. Cumplimentáis la información referente a la persona que lo presenta (dirección, nombre)
4. Cuando llegáis a solicitud buscáis con el asistente de búsqueda Universidad de Sevilla poniendo en asunto el nombre del centro "Para E.T.S. de Ingeniería Informática" y cumplimentáis el expone solicita con algo parecido a lo siguiente:
 
Expone:
 
Debido a que quiero cambiar de grupo a través de una permuta con otro compañero y dispongo la documentación pertinente.
 
Solicita:
 
El cambio de los grupos de la documentación adjunta.
 
5. Adjuntáis el PDF firmado por ambas partes que tenéis en la aplicación de permutas.
6. Termináis el proceso pulsando el botón firmar.
 
Así quedaría presentada vuestra permuta. Si tenéis dudas la escuela dispone de la siguiente página para la presentación de solicitudes: https://www.informatica.us.es/index.php/secretaria/solicitudes
`

export const mensajeAceptadaPermuta = `La permuta ha sido aceptada correctamente. Uno de los dos estudiantes debe validar la permuta en la aplicación de Permutas ETSII.`

export const mensajeFirmadaPermutaAlumno1 = (uvus) => `El documento de la permuta ha sido firmado correctamente. Cuando el estudiante ${uvus} firme el documento, la permuta será aceptada.`
export const mensajeFirmadaPermutaAlumno2 = (uvus) => `El estudiante ${uvus} ha firmado el documento de la permuta. Es necesario que tú también lo firmes para que la permuta sea aceptada.`
export const mensajeBorradorPermuta = `Se ha generado el borrador de la permuta. Debes rellenar el documento y firmarlo para que la permuta se pueda cumplimentar por el siguiente estudiante.`