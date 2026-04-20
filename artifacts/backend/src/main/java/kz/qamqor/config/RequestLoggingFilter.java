package kz.qamqor.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import kz.qamqor.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@Order(1)
public class RequestLoggingFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest  request  = (HttpServletRequest)  req;
        HttpServletResponse response = (HttpServletResponse) res;

        long start = System.currentTimeMillis();

        try {
            chain.doFilter(req, res);
        } finally {
            long ms     = System.currentTimeMillis() - start;
            int  status = response.getStatus();

            String uri = request.getRequestURI();
            if (request.getQueryString() != null) uri += "?" + request.getQueryString();

            String caller = resolveCaller();

            if (status >= 500) {
                log.error(">>> {} {} {} {}ms | ip={} user={}", request.getMethod(), uri, status, ms, request.getRemoteAddr(), caller);
            } else if (status >= 400) {
                log.warn (">>> {} {} {} {}ms | ip={} user={}", request.getMethod(), uri, status, ms, request.getRemoteAddr(), caller);
            } else {
                log.info (">>> {} {} {} {}ms | ip={} user={}", request.getMethod(), uri, status, ms, request.getRemoteAddr(), caller);
            }
        }
    }

    private String resolveCaller() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof User user) {
                return user.getEmail() + " [" + user.getRole().name().toLowerCase() + "]";
            }
        } catch (Exception ignored) { /* security context might not be set yet */ }
        return "anonymous";
    }
}
