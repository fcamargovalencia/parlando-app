# OAuth2 Google Sign-In + Email Transaccional — Plan Backend

> Rama sugerida: `feature/oauth-google-email`  
> Stack: Spring Boot 3.4 · WebFlux · R2DBC · Firebase Admin SDK · Brevo SMTP  
> Arquitectura: Hexagonal (ports & adapters)

---

## Resumen de funcionalidades

| ID | Funcionalidad | Sprint | Estado |
|----|---------------|--------|--------|
| F-1 | DB: campos OAuth en `users` | Sprint 1 | ❌ Pendiente |
| F-2 | Domain model: `User` + `UserEntity` | Sprint 1 | ❌ Pendiente |
| F-3 | Port `GoogleAuthPort` + record `GoogleUserInfo` | Sprint 1 | ❌ Pendiente |
| F-4 | Adapter `FirebaseAuthAdapter` | Sprint 1 | ❌ Pendiente |
| F-5 | `AuthUseCase.googleSignIn()` + `AuthService` | Sprint 2 | ❌ Pendiente |
| F-6 | `AuthController` endpoint `POST /v1/auth/google` | Sprint 2 | ❌ Pendiente |
| F-7 | Auto-linking cuenta LOCAL → GOOGLE | Sprint 2 | ❌ Pendiente |
| F-8 | `pom.xml` + `application.yml` para Brevo SMTP | Sprint 3 | ❌ Pendiente |
| F-9 | Port `EmailPort` | Sprint 3 | ❌ Pendiente |
| F-10 | Adapter `SmtpEmailAdapter` + templates HTML | Sprint 3 | ❌ Pendiente |
| F-11 | DB: tabla `email_verification_tokens` | Sprint 3 | ❌ Pendiente |
| F-12 | Flujo verificación de email post-registro | Sprint 4 | ❌ Pendiente |
| F-13 | Flujo reset de contraseña | Sprint 4 | ❌ Pendiente |
| F-14 | Notificaciones de viaje por email | Sprint 4 | ❌ Pendiente |
| F-15 | Tests unitarios | Sprint 5 | ❌ Pendiente |

---

## Dependencias entre sprints

```
Sprint 1 (Domain + Infraestructura base)
  └─► Sprint 2 (Google Sign-In — necesita GoogleAuthPort y campos DB)
        └─► Sprint 4 (Password reset — necesita saber si provider=GOOGLE)
Sprint 3 (Email base — independiente de Sprint 2)
  └─► Sprint 4 (Flujos de email — necesita EmailPort y tokens DB)
Sprint 5 (Tests — necesita todo lo anterior)
```

---

## Sprint 1 — Fundación: DB + Domain + Puerto Firebase

**Objetivo:** Toda la capa de dominio e infraestructura de persistencia lista para OAuth.  
**Duración estimada:** 1–2 días

---

### 1.1 Flyway Migration — `V55__add_oauth_fields_to_users.sql`

**Archivo:** `src/main/resources/db/migration/V55__add_oauth_fields_to_users.sql`

```sql
-- V55: Add OAuth provider fields to users table
ALTER TABLE users
  ADD COLUMN provider       VARCHAR(20)  NOT NULL DEFAULT 'LOCAL',
  ADD COLUMN google_id      VARCHAR(255)          DEFAULT NULL,
  ADD COLUMN email_verified BOOLEAN      NOT NULL DEFAULT FALSE;

-- Usuarios existentes con email tienen email ya "verificado" a nivel de provider
UPDATE users SET email_verified = TRUE WHERE provider = 'LOCAL';

CREATE UNIQUE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX idx_users_provider ON users(provider);
```

> **Nota:** `google_id` es nullable — los usuarios `LOCAL` no tienen uno.  
> El índice parcial `WHERE google_id IS NOT NULL` evita colisiones con NULLs múltiples.

---

### 1.2 Domain Model — `User.java`

**Archivo:** `src/main/java/com/parlando/api/domain/model/User.java`

Agregar tres campos al final del record (antes de `createdAt`):

```java
String provider;        // "LOCAL" | "GOOGLE"
String googleId;        // null para usuarios LOCAL
Boolean emailVerified;
```

---

### 1.3 Entity — `UserEntity.java`

**Archivo:** `src/main/java/com/parlando/api/infrastructure/out/persistence/entity/UserEntity.java`

```java
private String provider;       // DEFAULT 'LOCAL'
private String googleId;
private boolean emailVerified;
```

---

### 1.4 Entity Mapper — `UserEntityMapper.java`

**Archivo:** `src/main/java/com/parlando/api/infrastructure/out/persistence/mapper/UserEntityMapper.java`

Mapear los tres campos nuevos en ambas direcciones (`toDomain` y `toEntity`).  
El campo `googleId` se mapea como `@Mapping(source = "googleId", target = "google_id")` si aplica, o directamente por convención de nombres.

---

### 1.5 Domain Record — `GoogleUserInfo.java`

**Archivo:** `src/main/java/com/parlando/api/domain/model/GoogleUserInfo.java`

```java
package com.parlando.api.domain.model;

/** Información del usuario extraída del Firebase ID Token de Google. */
public record GoogleUserInfo(
    String uid,           // Firebase UID
    String email,
    String name,
    String photoUrl,
    boolean emailVerified
) {}
```

---

### 1.6 Port de salida — `GoogleAuthPort.java`

**Archivo:** `src/main/java/com/parlando/api/domain/port/out/GoogleAuthPort.java`

```java
package com.parlando.api.domain.port.out;

import com.parlando.api.domain.model.GoogleUserInfo;
import reactor.core.publisher.Mono;

/** Puerto de salida para verificación de tokens Firebase/Google. */
public interface GoogleAuthPort {

  /**
   * Verifica un Firebase ID Token y retorna la información del usuario de Google.
   *
   * @param firebaseIdToken token obtenido por el frontend tras signInWithPopup
   * @return GoogleUserInfo si el token es válido, error si es inválido/expirado
   */
  Mono<GoogleUserInfo> verifyIdToken(String firebaseIdToken);
}
```

---

### 1.7 Adapter — `FirebaseAuthAdapter.java`

**Archivo:** `src/main/java/com/parlando/api/infrastructure/out/firebase/FirebaseAuthAdapter.java`

```java
package com.parlando.api.infrastructure.out.firebase;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.parlando.api.domain.model.GoogleUserInfo;
import com.parlando.api.domain.port.out.GoogleAuthPort;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

/** Adapter que verifica Firebase ID Tokens usando Firebase Admin SDK. */
@Slf4j
@Component
public class FirebaseAuthAdapter implements GoogleAuthPort {

  @Override
  public Mono<GoogleUserInfo> verifyIdToken(String firebaseIdToken) {
    return Mono.fromCallable(() -> {
          FirebaseToken decoded = FirebaseAuth.getInstance().verifyIdToken(firebaseIdToken);
          return new GoogleUserInfo(
              decoded.getUid(),
              decoded.getEmail(),
              (String) decoded.getClaims().getOrDefault("name", ""),
              (String) decoded.getClaims().getOrDefault("picture", ""),
              decoded.isEmailVerified());
        })
        .subscribeOn(Schedulers.boundedElastic())
        .doOnError(e -> log.error("Firebase token verification failed: {}", e.getMessage()));
  }
}
```

> **Por qué `boundedElastic()`:** `FirebaseAuth.verifyIdToken()` es una llamada bloqueante HTTP a los servidores de Google. Debe ejecutarse en un hilo de I/O bloqueante, nunca en el event loop de Reactor.

---

### 1.8 `UserRepositoryPort` — nuevo método

**Archivo:** `src/main/java/com/parlando/api/domain/port/out/UserRepositoryPort.java`

Agregar:
```java
Mono<User> findByGoogleId(String googleId);
```

---

### 1.9 `UserR2dbcRepository` — query nativa

**Archivo:** `src/main/java/com/parlando/api/infrastructure/out/persistence/repository/UserR2dbcRepository.java`

```java
Mono<UserEntity> findByGoogleId(String googleId);
```

> Spring Data R2DBC genera la query automáticamente por convención de nombre.

---

### 1.10 `UserRepositoryAdapter` — implementar nuevo método

**Archivo:** `src/main/java/com/parlando/api/infrastructure/out/persistence/adapter/UserRepositoryAdapter.java`

```java
@Override
public Mono<User> findByGoogleId(String googleId) {
  return repository.findByGoogleId(googleId).map(UserEntityMapper.INSTANCE::toDomain);
}
```

---

### ✅ Checklist Sprint 1

- [ ] Migration `V55` aplicada sin errores
- [ ] `User.java` compila con los 3 campos nuevos
- [ ] `UserEntity.java` mapeado correctamente
- [ ] `GoogleUserInfo.java` creado
- [ ] `GoogleAuthPort.java` creado
- [ ] `FirebaseAuthAdapter.java` implementado y registrado como `@Component`
- [ ] `UserRepositoryPort.findByGoogleId()` añadido e implementado
- [ ] Build sin errores: `./mvnw compile`

---

## Sprint 2 — Google Sign-In: Caso de uso + Endpoint

**Objetivo:** Endpoint funcional `POST /v1/auth/google` con auto-linking.  
**Duración estimada:** 1–2 días

---

### 2.1 `AuthUseCase` — nuevo método

**Archivo:** `src/main/java/com/parlando/api/application/port/in/AuthUseCase.java`

```java
Mono<Result<TokenPair>> googleSignIn(String firebaseIdToken);
```

---

### 2.2 `AuthConfig` — inyectar `GoogleAuthPort`

**Archivo:** `src/main/java/com/parlando/api/infrastructure/config/application/AuthConfig.java`

Agregar `GoogleAuthPort googleAuthPort` como parámetro del bean `authUseCase` y pasarlo al constructor de `AuthService`.

---

### 2.3 `AuthService` — implementar `googleSignIn`

**Archivo:** `src/main/java/com/parlando/api/application/service/AuthService.java`

```java
private static final String ERR_GOOGLE_TOKEN_INVALID = "Token de Google invalido";
private static final String ERR_GOOGLE_SIGN_IN_FAIL = "Error al iniciar sesion con Google";
```

Lógica del método `googleSignIn(String firebaseIdToken)`:

```
1. googleAuthPort.verifyIdToken(firebaseIdToken)
   → onError → Result.failure(ERR_GOOGLE_TOKEN_INVALID)

2. Con GoogleUserInfo obtenido:

   a) userRepo.findByGoogleId(info.uid())
      → si existe → generar JWT pair → Result.success(tokenPair)

   b) si no existe → userRepo.findByEmail(info.email())
      → si existe CON provider=LOCAL:
          AUTO-LINK: user.toBuilder()
            .googleId(info.uid())
            .emailVerified(true)
            .provider("GOOGLE")
            .updatedAt(now)
            .build()
          guardar → generar JWT pair → Result.success(tokenPair)

   c) si no existe ninguno → crear usuario nuevo:
          User.builder()
            .id(UUID.randomUUID().toString())
            .email(info.email())
            .firstName(parseName(info.name()).firstName)
            .lastName(parseName(info.name()).lastName)
            .profilePhotoUrl(info.photoUrl())
            .provider("GOOGLE")
            .googleId(info.uid())
            .emailVerified(true)
            .passwordHash(null)
            .phoneVerified(false)
            .verificationLevel(VerificationLevel.UNVERIFIED)
            .trustScore(0.0)
            .role(Role.PASSENGER)
            .status(UserStatus.ACTIVE)
            .acceptedTermsAt(now)
            .createdAt(now)
            .updatedAt(now)
            .build()
          guardar → generar JWT pair → Result.success(tokenPair)

3. onErrorResume → Result.failure(ERR_GOOGLE_SIGN_IN_FAIL)
```

> **Helper privado `parseName(String fullName)`:** divide el nombre completo en `firstName` (primera palabra) y `lastName` (resto). Si el nombre está vacío, ambos son cadena vacía.

---

### 2.4 DTO — `GoogleSignInRequest.java`

**Archivo:** `src/main/java/com/parlando/api/infrastructure/in/web/dto/request/GoogleSignInRequest.java`

```java
package com.parlando.api.infrastructure.in.web.dto.request;

import jakarta.validation.constraints.NotBlank;

public record GoogleSignInRequest(
    @NotBlank(message = "Firebase ID Token es requerido")
    String firebaseIdToken
) {}
```

---

### 2.5 `AuthController` — endpoint Google Sign-In

**Archivo:** `src/main/java/com/parlando/api/infrastructure/in/web/controller/AuthController.java`

```java
@PostMapping("/google")
@Operation(summary = "Iniciar sesion o registrarse con Google (Firebase)")
@io.swagger.v3.oas.annotations.responses.ApiResponse(
    responseCode = "200", description = "Login/registro exitoso",
    content = @Content(schema = @Schema(implementation = AuthResponse.class)))
@io.swagger.v3.oas.annotations.responses.ApiResponse(
    responseCode = "401", description = "Token de Firebase invalido")
public Mono<ResponseEntity<ApiResponse<?>>> googleSignIn(
    @RequestBody @Valid GoogleSignInRequest request) {
  return authUseCase
      .googleSignIn(request.firebaseIdToken())
      .map(result -> result.isSuccess()
          ? ResponseEntity.ok(ApiResponse.success(result.getValue()))
          : ResponseEntity.status(HttpStatus.UNAUTHORIZED)
              .body(ApiResponse.error(result.getError())));
}
```

---

### 2.6 `SecurityConfig` — permitir endpoint Google

**Archivo:** `src/main/java/com/parlando/api/infrastructure/config/SecurityConfig.java`

Añadir `/api/v1/auth/google` a la lista de paths sin autenticación (junto a `/api/v1/auth/login`, `/api/v1/auth/register`, etc.).

---

### 2.7 `UserMapper` — helper para Google users

**Archivo:** `src/main/java/com/parlando/api/application/mappers/UserMapper.java`

```java
default User withGoogleLinked(User user, String googleId) {
  return user.toBuilder()
      .googleId(googleId)
      .emailVerified(true)
      .provider("GOOGLE")
      .updatedAt(OffsetDateTime.now())
      .build();
}
```

---

### ✅ Checklist Sprint 2

- [ ] `AuthUseCase.googleSignIn()` declarado
- [ ] `AuthService.googleSignIn()` implementado con los 3 flujos (nuevo / link / existente)
- [ ] `GoogleSignInRequest.java` creado con validación
- [ ] Endpoint `POST /api/v1/auth/google` accesible sin JWT
- [ ] Auto-linking funciona: usuario `LOCAL` queda con `provider=GOOGLE` y `googleId` seteado
- [ ] Usuario nuevo creado sin `passwordHash` y con `emailVerified=true`
- [ ] Tests manuales con Postman/Swagger

---

## Sprint 3 — Email Transaccional: Infraestructura Base

**Objetivo:** Adapter SMTP operativo con Brevo y templates listos.  
**Duración estimada:** 1–2 días

---

### 3.1 `pom.xml` — dependencia `spring-boot-starter-mail`

**Archivo:** `pom.xml`

```xml
<!-- Spring Mail (Brevo SMTP / transactional email) -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-mail</artifactId>
</dependency>
```

> La versión está gestionada por el BOM de Spring Boot 3.4.

---

### 3.2 `application.yml` — configuración Brevo SMTP

**Archivo:** `src/main/resources/application.yml`

```yaml
spring:
  mail:
    host: smtp-relay.brevo.com
    port: 587
    username: ${MAIL_USERNAME}
    password: ${MAIL_PASSWORD}
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true
            required: true

app:
  mail:
    from: ${MAIL_FROM:noreply@parlando.app}
    from-name: ${MAIL_FROM_NAME:ParlAndo}
    base-url: ${APP_BASE_URL:http://localhost:8080}
```

**Variables de entorno requeridas (`.env`):**

```env
MAIL_USERNAME=tu_usuario_brevo@ejemplo.com  # Login SMTP de Brevo
MAIL_PASSWORD=xsmtpsib-...                   # SMTP key de Brevo (Settings → SMTP & API)
MAIL_FROM=noreply@tudominio.com
MAIL_FROM_NAME=ParlAndo
APP_BASE_URL=https://api.parlando.app
```

> **Cómo obtener credenciales Brevo:** Dashboard → Settings → Senders & IP → SMTP & API → Generate SMTP key.

---

### 3.3 Port de salida — `EmailPort.java`

**Archivo:** `src/main/java/com/parlando/api/domain/port/out/EmailPort.java`

```java
package com.parlando.api.domain.port.out;

import reactor.core.publisher.Mono;

/** Puerto de salida para envío de emails transaccionales. */
public interface EmailPort {

  /** Email de bienvenida tras registro. */
  Mono<Void> sendWelcome(String to, String firstName);

  /** Email con enlace de verificación de dirección de correo. */
  Mono<Void> sendEmailVerification(String to, String firstName, String verificationToken);

  /** Email con enlace de reset de contraseña. */
  Mono<Void> sendPasswordReset(String to, String firstName, String resetToken);

  /** Notificación genérica de viaje (reserva confirmada, cancelación, etc.). */
  Mono<Void> sendTripNotification(String to, String subject, String htmlBody);
}
```

---

### 3.4 Templates HTML — archivos de plantilla

**Directorio:** `src/main/resources/templates/email/`

Crear los siguientes archivos con HTML simple (compatible con los principales clientes de email):

**`welcome.html`** — Variables: `{{firstName}}`, `{{appName}}`

```html
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
  <h2 style="color: #2C7A7B;">¡Bienvenido a ParlAndo, {{firstName}}! 🎉</h2>
  <p>Tu cuenta ha sido creada exitosamente. Ya puedes empezar a compartir viajes.</p>
  <p>El equipo de ParlAndo</p>
</body>
</html>
```

**`email-verification.html`** — Variables: `{{firstName}}`, `{{verificationUrl}}`

```html
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
  <h2 style="color: #2C7A7B;">Verifica tu correo, {{firstName}}</h2>
  <p>Haz clic en el botón para verificar tu dirección de email:</p>
  <a href="{{verificationUrl}}"
     style="background-color: #2C7A7B; color: white; padding: 12px 24px;
            text-decoration: none; border-radius: 6px; display: inline-block;">
    Verificar email
  </a>
  <p style="color: #888; font-size: 12px;">Este enlace expira en 24 horas.</p>
</body>
</html>
```

**`password-reset.html`** — Variables: `{{firstName}}`, `{{resetUrl}}`

```html
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
  <h2 style="color: #2C7A7B;">Restablecer contraseña</h2>
  <p>Hola {{firstName}}, recibimos una solicitud para restablecer tu contraseña.</p>
  <a href="{{resetUrl}}"
     style="background-color: #E53E3E; color: white; padding: 12px 24px;
            text-decoration: none; border-radius: 6px; display: inline-block;">
    Restablecer contraseña
  </a>
  <p style="color: #888; font-size: 12px;">
    Si no solicitaste esto, ignora este correo. El enlace expira en 1 hora.
  </p>
</body>
</html>
```

---

### 3.5 Adapter — `SmtpEmailAdapter.java`

**Archivo:** `src/main/java/com/parlando/api/infrastructure/out/email/SmtpEmailAdapter.java`

```java
package com.parlando.api.infrastructure.out.email;

import com.parlando.api.domain.port.out.EmailPort;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;
import java.nio.charset.StandardCharsets;

/** Adapter que envía emails transaccionales vía SMTP (Brevo). */
@Slf4j
@Component
@RequiredArgsConstructor
public class SmtpEmailAdapter implements EmailPort {

  private final JavaMailSender mailSender;

  @Value("${app.mail.from}")
  private String from;

  @Value("${app.mail.from-name}")
  private String fromName;

  @Value("${app.mail.base-url}")
  private String baseUrl;

  @Override
  public Mono<Void> sendWelcome(String to, String firstName) {
    return sendTemplate(to, "¡Bienvenido a ParlAndo!", "templates/email/welcome.html",
        html -> html.replace("{{firstName}}", firstName)
                    .replace("{{appName}}", "ParlAndo"));
  }

  @Override
  public Mono<Void> sendEmailVerification(String to, String firstName, String token) {
    String verificationUrl = baseUrl + "/api/v1/auth/verify-email?token=" + token;
    return sendTemplate(to, "Verifica tu correo — ParlAndo", "templates/email/email-verification.html",
        html -> html.replace("{{firstName}}", firstName)
                    .replace("{{verificationUrl}}", verificationUrl));
  }

  @Override
  public Mono<Void> sendPasswordReset(String to, String firstName, String token) {
    String resetUrl = baseUrl + "/api/v1/auth/password-reset/confirm?token=" + token;
    return sendTemplate(to, "Restablecer contraseña — ParlAndo", "templates/email/password-reset.html",
        html -> html.replace("{{firstName}}", firstName)
                    .replace("{{resetUrl}}", resetUrl));
  }

  @Override
  public Mono<Void> sendTripNotification(String to, String subject, String htmlBody) {
    return sendHtml(to, subject, htmlBody);
  }

  // ── Private helpers ──────────────────────────────────────────────

  private Mono<Void> sendTemplate(String to, String subject, String templatePath,
      java.util.function.UnaryOperator<String> replacer) {
    return Mono.fromCallable(() -> {
          String template = loadTemplate(templatePath);
          String body = replacer.apply(template);
          send(to, subject, body);
          return null;
        })
        .subscribeOn(Schedulers.boundedElastic())
        .doOnError(e -> log.error("Email send failed to={} subject={}: {}", to, subject, e.getMessage()))
        .onErrorResume(e -> Mono.empty())
        .then();
  }

  private Mono<Void> sendHtml(String to, String subject, String htmlBody) {
    return Mono.fromCallable(() -> { send(to, subject, htmlBody); return null; })
        .subscribeOn(Schedulers.boundedElastic())
        .doOnError(e -> log.error("Email send failed: {}", e.getMessage()))
        .onErrorResume(e -> Mono.empty())
        .then();
  }

  private void send(String to, String subject, String html) throws Exception {
    MimeMessage message = mailSender.createMimeMessage();
    MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
    helper.setFrom(from, fromName);
    helper.setTo(to);
    helper.setSubject(subject);
    helper.setText(html, true);
    mailSender.send(message);
  }

  private String loadTemplate(String path) throws Exception {
    return new ClassPathResource(path)
        .getContentAsString(StandardCharsets.UTF_8);
  }
}
```

> **Por qué `onErrorResume → Mono.empty()`:** Los emails no deben bloquear el flujo principal de negocio. Un fallo de SMTP no debe fallar un registro o una reserva de viaje.

---

### 3.6 `EmailConfig.java`

**Archivo:** `src/main/java/com/parlando/api/infrastructure/config/application/EmailConfig.java`

```java
package com.parlando.api.infrastructure.config.application;

import com.parlando.api.domain.port.out.EmailPort;
import com.parlando.api.infrastructure.out.email.SmtpEmailAdapter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;

@Configuration
public class EmailConfig {

  @Bean
  public EmailPort emailPort(JavaMailSender mailSender) {
    return new SmtpEmailAdapter(mailSender);
  }
}
```

> Si `SmtpEmailAdapter` está anotado con `@Component` no necesita este bean explícito.  
> Mantenerlo da la flexibilidad de swappear el adapter (ej: mock en tests, SDK REST de Brevo en producción).

---

### 3.7 Flyway Migration — `V56__create_email_verification_tokens.sql`

**Archivo:** `src/main/resources/db/migration/V56__create_email_verification_tokens.sql`

```sql
-- V56: Email verification and password reset tokens
CREATE TYPE email_token_type AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET');

CREATE TABLE email_verification_tokens (
  id         UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID                     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(255)             NOT NULL UNIQUE,
  type       email_token_type         NOT NULL,
  expires_at TIMESTAMPTZ              NOT NULL,
  used       BOOLEAN                  NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ              NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_tokens_token   ON email_verification_tokens(token);
CREATE INDEX idx_email_tokens_user_id ON email_verification_tokens(user_id);
```

---

### ✅ Checklist Sprint 3

- [ ] `spring-boot-starter-mail` en `pom.xml`
- [ ] Variables `MAIL_*` configuradas en `.env`
- [ ] `EmailPort.java` creado
- [ ] Templates HTML en `resources/templates/email/`
- [ ] `SmtpEmailAdapter.java` implementado
- [ ] Test manual enviando email con Postman trigger o test temporal
- [ ] Migration `V56` aplicada
- [ ] Build sin errores: `./mvnw compile`

---

## Sprint 4 — Flujos de Email: Verificación + Reset + Notificaciones

**Objetivo:** Casos de uso completos de recuperación de contraseña, verificación de email y notificaciones de viaje.  
**Duración estimada:** 2–3 días

---

### 4.1 `AuthUseCase` — nuevos métodos

**Archivo:** `src/main/java/com/parlando/api/application/port/in/AuthUseCase.java`

```java
/** Envía email de verificación al usuario recién registrado. */
Mono<Result<Void>> sendEmailVerification(String userId);

/** Confirma la verificación de email usando el token recibido. */
Mono<Result<Void>> verifyEmail(String token);

/** Envía email de reset de contraseña dado un email de cuenta LOCAL. */
Mono<Result<Void>> sendPasswordResetEmail(String email);

/** Confirma el reset de contraseña usando el token y la nueva contraseña. */
Mono<Result<Void>> resetPassword(String token, String newPassword);
```

---

### 4.2 `EmailVerificationToken` — domain model

**Archivo:** `src/main/java/com/parlando/api/domain/model/EmailVerificationToken.java`

```java
package com.parlando.api.domain.model;

import java.time.OffsetDateTime;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class EmailVerificationToken {
  String id;
  String userId;
  String token;
  String type;   // "EMAIL_VERIFY" | "PASSWORD_RESET"
  OffsetDateTime expiresAt;
  boolean used;
  OffsetDateTime createdAt;
}
```

---

### 4.3 Port de salida — `EmailTokenRepositoryPort.java`

**Archivo:** `src/main/java/com/parlando/api/domain/port/out/EmailTokenRepositoryPort.java`

```java
package com.parlando.api.domain.port.out;

import com.parlando.api.domain.model.EmailVerificationToken;
import reactor.core.publisher.Mono;

public interface EmailTokenRepositoryPort {
  Mono<EmailVerificationToken> save(EmailVerificationToken token);
  Mono<EmailVerificationToken> findByToken(String token);
  Mono<Void> markAsUsed(String tokenId);
}
```

---

### 4.4 `AuthService` — implementar flujos de email

**Archivo:** `src/main/java/com/parlando/api/application/service/AuthService.java`

**`sendPasswordResetEmail(String email)`:**
```
1. Verificar que el usuario existe por email → ERROR si no existe
2. Verificar provider != "GOOGLE" → si es GOOGLE, retornar error descriptivo:
   "Esta cuenta usa Google Sign-In. Inicia sesion con Google."
3. Generar token seguro (SecureRandom, 64 chars hex)
4. Guardar EmailVerificationToken(type=PASSWORD_RESET, expiresAt=now+1h)
5. emailPort.sendPasswordReset(email, firstName, token)
6. Result.success(null)
```

**`resetPassword(String token, String newPassword)`:**
```
1. emailTokenRepo.findByToken(token) → ERROR si no existe
2. Verificar tipo = PASSWORD_RESET
3. Verificar !used → ERROR "Token ya utilizado"
4. Verificar expiresAt > now → ERROR "Token expirado"
5. Hashear newPassword con passwordHasher
6. Actualizar user.passwordHash + updatedAt
7. emailTokenRepo.markAsUsed(token.id)
8. Result.success(null)
```

**`sendEmailVerification(String userId)`:**
```
1. Buscar usuario por id
2. Si emailVerified = true → no hacer nada (Result.success)
3. Generar token, guardar con type=EMAIL_VERIFY, expiresAt=now+24h
4. emailPort.sendEmailVerification(email, firstName, token)
```

**`verifyEmail(String token)`:**
```
1. findByToken → verificar tipo, not used, not expired
2. Actualizar user.emailVerified = true
3. markAsUsed
```

---

### 4.5 Integrar email de bienvenida en `register()`

**Archivo:** `src/main/java/com/parlando/api/application/service/AuthService.java`

Al final del flujo de `register()`, tras guardar el usuario exitosamente, encadenar:

```java
.flatMap(tokenPair ->
    emailPort.sendWelcome(savedUser.getEmail(), savedUser.getFirstName())
        .thenReturn(Result.success(tokenPair))
)
```

> El `onErrorResume` en `SmtpEmailAdapter` garantiza que un fallo de email no rompa el registro.

---

### 4.6 `AuthController` — nuevos endpoints

**Archivo:** `src/main/java/com/parlando/api/infrastructure/in/web/controller/AuthController.java`

```
POST /v1/auth/password-reset/request
  body: { "email": "usuario@email.com" }
  response: 200 { message: "Si el email existe, recibirás instrucciones." }

POST /v1/auth/password-reset/confirm
  body: { "token": "...", "newPassword": "..." }
  response: 200 { message: "Contraseña actualizada correctamente." }

POST /v1/auth/verify-email/send
  header: Authorization: Bearer <jwt>
  response: 200 { message: "Email de verificación enviado." }

GET /v1/auth/verify-email?token=...
  response: 200 o 400 según validez del token
```

> El endpoint `GET /v1/auth/verify-email` puede devolver un redirect a la app móvil via deep link, o un JSON simple.

---

### 4.7 Notificaciones de viaje por email

Cuando ocurra un evento relevante (reserva confirmada, viaje cancelado, etc.) los servicios correspondientes (`BookingService`, `TripService`) deben inyectar `EmailPort` y hacer:

```java
emailPort.sendTripNotification(
    passenger.getEmail(),
    "Tu reserva fue confirmada — ParlAndo",
    buildBookingConfirmationHtml(booking, trip)
);
```

> Crear un helper `TripEmailTemplates.java` en `infrastructure/out/email/` con métodos estáticos que construyen el HTML de cada notificación.

---

### ✅ Checklist Sprint 4

- [ ] `AuthUseCase` con los 4 métodos nuevos
- [ ] `EmailVerificationToken` domain model + entity + adapter
- [ ] `sendPasswordResetEmail` rechaza cuentas Google con mensaje descriptivo
- [ ] `resetPassword` valida tipo, expiración y uso del token
- [ ] Email de bienvenida se envía en `register()`
- [ ] Email de bienvenida se envía en `googleSignIn()` para usuarios nuevos
- [ ] Endpoints de reset y verificación funcionando
- [ ] `SecurityConfig` — permisos correctos para los nuevos endpoints

---

## Sprint 5 — Tests

**Objetivo:** Cobertura >90% líneas, >85% branches para código nuevo.  
**Duración estimada:** 1–2 días

---

### 5.1 Tests para `FirebaseAuthAdapter`

**Archivo:** `src/test/java/.../infrastructure/out/firebase/FirebaseAuthAdapterTest.java`

- Mock `FirebaseAuth` para token válido → verifica `GoogleUserInfo` mapeado
- Simular error de Firebase → verifica propagación como error reactivo

---

### 5.2 Tests para `AuthService.googleSignIn()`

**Archivo:** `src/test/java/.../application/service/AuthServiceTest.java` (clase interna)

Casos:
- Token inválido → `Result.failure(ERR_GOOGLE_TOKEN_INVALID)`
- Usuario nuevo → se crea con campos correctos, se retorna `TokenPair`
- Usuario existente por `googleId` → login directo sin modificar usuario
- Usuario LOCAL existente → auto-link: verificar campos actualizados
- Google user sin `phone` → `phoneVerified = false`

---

### 5.3 Tests para `SmtpEmailAdapter`

**Archivo:** `src/test/java/.../infrastructure/out/email/SmtpEmailAdapterTest.java`

- Mock `JavaMailSender` → verificar llamada a `send()` con subject y destinatario correctos
- Simular fallo SMTP → verificar que `Mono` completa (no propaga error)
- Template loading → verificar que placeholders `{{firstName}}` son reemplazados

---

### 5.4 Tests para flujo reset de contraseña

Casos:
- Email de cuenta Google → error descriptivo
- Email no existe → `Result.failure`
- Token expirado → `Result.failure`
- Token ya usado → `Result.failure`
- Token válido → password actualizado y token marcado como usado

---

### ✅ Checklist Sprint 5

- [ ] `./mvnw test` pasa sin errores existentes rotos
- [ ] Cobertura JaCoCo ≥ 90% líneas en código nuevo
- [ ] Tests de `googleSignIn` cubren los 3 flujos (nuevo, link, existente)
- [ ] Tests de email no fallan el pipeline si SMTP no está disponible en CI

---

## Consideraciones finales

### Seguridad
- Los tokens de reset/verificación deben ser de **64 caracteres hex** generados con `SecureRandom` — nunca UUIDs (predecibles).
- El endpoint `password-reset/request` **siempre responde 200** aunque el email no exista (evita user enumeration).
- Los tokens se almacenan **hasheados** en DB si se quiere máxima seguridad, aunque para MVP sin hashear es aceptable.

### Escalabilidad email
- Si el volumen de notificaciones de viaje crece, envolver `SmtpEmailAdapter` con una **cola Redis** (`LPUSH` / `BRPOP`) para reintentos automáticos.
- Migración futura a API REST de Brevo (en vez de SMTP) es un cambio de `SmtpEmailAdapter` sin tocar ports ni domain.

### Usuarios Google sin contraseña
- Bloquear `POST /v1/auth/password-reset/request` para `provider=GOOGLE` con mensaje: `"Cuenta vinculada con Google. Inicia sesión con Google Sign-In."`
- Nunca exponer si el email existe o no en la respuesta pública del endpoint.

