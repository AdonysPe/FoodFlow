# Checklist de verificación pre-lanzamiento

## Preparación

- [ ] Ejecutar `npm ci`.
- [ ] Ejecutar `npm run lint`.
- [ ] Ejecutar `npm test`.
- [ ] Ejecutar `npm run build`.
- [ ] Ejecutar `npm run db:migrate:deploy` contra la base de datos de producción.
- [ ] Confirmar en Vercel que `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`, SMTP, OSE, S3 y las variables `NEXT_PUBLIC_LEGAL_*` están configuradas.
- [ ] Publicar una carta real y guardar su slug como `<slug>`.
- [ ] Ejecutar el humo remoto:

```powershell
$env:SMOKE_BASE_URL="https://foodflow.site"
$env:SMOKE_WILDCARD_HOST="<slug>.foodflow.site"
npm run test:smoke
```

## 1. QR genera la web de pedidos

- [ ] Iniciar sesión como dueño.
- [ ] Abrir `Dashboard > Carta digital`.
- [ ] Publicar la carta y confirmar que tiene al menos una categoría y un producto disponible.
- [ ] Descargar o mostrar el QR del local.
- [ ] Escanear el QR desde un teléfono sin sesión iniciada.
- [ ] Confirmar HTTP 200 y URL `https://<slug>.foodflow.site/` o `/carta/<slug>`.
- [ ] Confirmar nombre del restaurante, categorías, productos, precios y botón de WhatsApp.
- [ ] Agregar dos productos, abrir el resumen y enviar el pedido.
- [ ] Confirmar que WhatsApp recibe restaurante, productos, cantidades, notas y total.
- [ ] Guardar captura del QR, URL final y mensaje recibido.

## 2. Pedido llega a cocina

- [ ] Abrir una mesa libre en `Dashboard > Comanda`.
- [ ] Crear un pedido con dos platos y una nota de preparación.
- [ ] Enviar la ronda a cocina.
- [ ] Abrir la pantalla de cocina en otra sesión/dispositivo.
- [ ] Confirmar que aparece sin recargar, con mesa, platos, cantidades, nota, hora y mozo.
- [ ] Cambiar el pedido por `preparando`, `listo` y `entregado`.
- [ ] Confirmar que cada estado se refleja en Comanda.
- [ ] Guardar ID del pedido y capturas de cada estado.

## 3. Cobro genera boleta/factura

- [ ] Abrir `Dashboard > Configuración > Facturación`.
- [ ] Confirmar RUC, razón social, dirección fiscal, teléfono, correo, certificado, OSE, series y prueba OSE exitosa.
- [ ] Cobrar el pedido de prueba seleccionando `Boleta`.
- [ ] Confirmar número correlativo, total, IGV, estado `ACEPTADO`, QR y hash SUNAT.
- [ ] Repetir con un pedido nuevo seleccionando `Factura` e ingresar RUC, razón social y dirección del cliente.
- [ ] Confirmar número correlativo de factura y estado `ACEPTADO`.
- [ ] Confirmar que ambos comprobantes muestran emisor del restaurante y bloque legal de FoodFlow.
- [ ] Guardar IDs de pedido, CDR y números de comprobante.

## 4. PDF/XML se envía por email

- [ ] Usar un correo de prueba controlado al cobrar la boleta y la factura.
- [ ] Ejecutar el job `POST /api/cron/billing/send-emails` con `Authorization: Bearer <CRON_SECRET>` si el envío no es inmediato.
- [ ] Confirmar recepción del correo y revisar spam.
- [ ] Abrir el enlace PDF y validar emisor, cliente, serie, correlativo, fecha, importes, IGV, QR y hash.
- [ ] Descargar el XML y validar que corresponde al mismo número y total.
- [ ] Confirmar en DB que `cdrs.emailed_at` no sea nulo.
- [ ] Guardar encabezados del correo y checksums de PDF/XML como evidencia.

## 5. CDR se guarda en S3/backup

- [ ] Confirmar que `S3_BUCKET_CDRS`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` y, si aplica, `S3_ENDPOINT` están configurados.
- [ ] Ejecutar `POST /api/cron/billing/backup-cdrs` con `Authorization: Bearer <CRON_SECRET>`.
- [ ] Confirmar respuesta sin fallos y `processed >= 1`.
- [ ] Confirmar en DB que `cdrs.backup_url` contiene `s3://<bucket>/...` para ambos comprobantes.
- [ ] Verificar en el bucket privado que existen los objetos y no tienen acceso público.
- [ ] Restaurar un objeto en un entorno aislado y validar XML, PDF/URL y metadatos.
- [ ] Consultar `GET https://foodflow.site/api/health` y confirmar `checks.storage.status = "ok"` y `pendingBackups = 0`.

## 6. Libro de Reclamaciones

- [ ] Abrir `https://foodflow.site/libro-de-reclamaciones` sin sesión.
- [ ] Confirmar razón social, dirección fiscal, correo legal y teléfono.
- [ ] Enviar un reclamo con Nombre, DNI, Teléfono, Email, Distrito, Tipo y Detalle.
- [ ] Confirmar pantalla de éxito y copiar el ticket `LR-AAAA-NNNNNN`.
- [ ] Buscar el ticket en la tabla `complaints` y validar todos los campos, `status = recibido` y `created_at`.
- [ ] Repetir con Tipo `Queja` y confirmar un ticket distinto.
- [ ] Confirmar que DNI, email e IP sin procesar no aparecen en logs.
- [ ] Guardar captura de confirmación y export de las dos filas como evidencia.

## Cierre

- [ ] `GET /api/health` responde HTTP 200 y `status = "ok"`.
- [ ] Los cinco tests de `tests/smoke.test.ts` pasan.
- [ ] No hay errores nuevos en el servicio de logging durante las pruebas.
- [ ] Responsable técnico y responsable legal firman la evidencia y fecha de lanzamiento.
