package com.vendora.controller;

import com.vendora.dto.ApiDtos.*;
import com.vendora.entity.User;
import com.vendora.repository.UserRepository;
import com.vendora.security.CustomUserDetailsService;
import com.vendora.security.JwtService;
import com.vendora.service.AuditService;
import com.vendora.service.SecurityHelper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "01. Authentication", description = "JWT Login, Logout, Session Profile, and Demo Credentials")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final CustomUserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final SecurityHelper securityHelper;
    private final AuditService auditService;

    @PostMapping("/login")
    @Operation(summary = "Authenticate user and issue JWT token")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail().trim(), request.getPassword())
        );

        User user = userRepository.findByEmailIgnoreCase(request.getEmail().trim())
                .orElseThrow();
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());

        String token = jwtService.generateToken(userDetails, Map.of(
                "userId", user.getUserId(),
                "role", user.getRole().getRoleName(),
                "name", user.getName()
        ));

        auditService.log(user, "Auth", "LOGIN", "User", user.getUserId(),
                "User " + user.getEmail() + " (" + user.getRole().getRoleName() + ") signed in");

        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
                .user(securityHelper.toUserDto(user))
                .build());
    }

    @PostMapping("/logout")
    @Operation(summary = "Log out current user and record audit event")
    public ResponseEntity<Map<String, String>> logout() {
        try {
            User user = securityHelper.getCurrentUser();
            auditService.log(user, "Auth", "LOGOUT", "User", user.getUserId(),
                    "User " + user.getEmail() + " signed out");
        } catch (Exception ignored) {
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user profile")
    public ResponseEntity<UserDto> me() {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(securityHelper.toUserDto(currentUser));
    }

    @GetMapping("/demo-accounts")
    @Operation(summary = "List development demo accounts for quick role switching")
    public ResponseEntity<List<Map<String, String>>> getDemoAccounts() {
        return ResponseEntity.ok(List.of(
                Map.of("role", "SYSTEM_ADMIN", "name", "Marcus Vance", "email", "admin@vendora.io", "password", "Vendora@2026", "badge", "Full Governance"),
                Map.of("role", "PROCUREMENT_ADMIN", "name", "Elena Rostova", "email", "procurement@vendora.io", "password", "Vendora@2026", "badge", "Vendor & Contract Ops"),
                Map.of("role", "PROCUREMENT_MANAGER", "name", "David Sterling", "email", "manager@vendora.io", "password", "Vendora@2026", "badge", "Approvals & Reviews"),
                Map.of("role", "FINANCE", "name", "Sophia Chen", "email", "finance@vendora.io", "password", "Vendora@2026", "badge", "Invoices & Treasury"),
                Map.of("role", "EMPLOYEE", "name", "Liam O'Connor", "email", "employee@vendora.io", "password", "Vendora@2026", "badge", "Internal Requester"),
                Map.of("role", "VENDOR", "name", "Apex Cloud Systems", "email", "portal@apexcloud.io", "password", "Vendora@2026", "badge", "Supplier Portal #1"),
                Map.of("role", "VENDOR", "name", "NovaTech Industrial", "email", "portal@novatech.io", "password", "Vendora@2026", "badge", "Supplier Portal #2")
        ));
    }
}
