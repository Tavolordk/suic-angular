SPM Frontend - IA 3.1.4

- Razonar activado: sólo se muestra el estado genérico de razonamiento; no se expone chain-of-thought.
- Razonar desactivado: la respuesta se pinta desde el primer delta recibido, token/chunk a chunk.
- Si la API detecta que la salida directa quedó en inglés o truncada, envía un evento replace y el frontend sustituye la salida provisional por la respuesta final completa en español.
- El evento done.text sigue siendo la fuente definitiva al finalizar.
