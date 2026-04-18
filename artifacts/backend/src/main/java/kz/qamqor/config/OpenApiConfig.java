package kz.qamqor.config;

import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
@SecurityScheme(
    name = "bearerAuth",
    type = SecuritySchemeType.HTTP,
    scheme = "bearer",
    bearerFormat = "JWT",
    description = "Put JWT-token, got from /api/v1/auth/verify-otp"
)
public class OpenApiConfig {

    @Value("${server.port:8080}")
    private int serverPort;

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("Qamqor API")
                .description("""
                    REST API for **Qamqor** platform.

                    ## Authentication
                    1. `POST /api/v1/auth/send-otp` — send OTP-code to email
                    2. `POST /api/v1/auth/verify-otp` — confirm code, get JWT-token
                    3. Press **Authorize** button and paste got token
                    """)
                .version("1.0.0")
                .contact(new Contact()
                    .name("Qamqor Team")
                    .email("support@qamqor.kz")))
            .servers(List.of(
                new Server().url("http://localhost:" + serverPort).description("Local"),
                new Server().url("https://api.qamqor.kz").description("Production")
            ));
    }
}
