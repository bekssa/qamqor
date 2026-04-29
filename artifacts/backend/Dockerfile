# ──────────────────────────────────────────
# Stage 1: Build
# ──────────────────────────────────────────
FROM eclipse-temurin:24-jdk-alpine AS builder

WORKDIR /app

RUN apk add --no-cache maven

COPY pom.xml ./
RUN mvn dependency:go-offline -q

# Copy source and build
COPY src ./src
RUN mvn package -DskipTests -q

# ──────────────────────────────────────────
# Stage 2: Runtime
# ──────────────────────────────────────────
FROM eclipse-temurin:24-jdk-alpine

WORKDIR /app

# Non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring
USER spring

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
