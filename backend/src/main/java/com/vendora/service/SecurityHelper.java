package com.vendora.service;

import com.vendora.dto.ApiDtos.UserDto;
import com.vendora.entity.User;
import com.vendora.entity.Vendor;
import com.vendora.exception.ResourceNotFoundException;
import com.vendora.repository.UserRepository;
import com.vendora.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SecurityHelper {

    private final UserRepository userRepository;
    private final VendorRepository vendorRepository;

    public User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new AccessDeniedException("User is not authenticated");
        }
        String email = auth.getName();
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found: " + email));
    }

    public boolean hasRole(User user, String... roles) {
        if (user == null || user.getRole() == null) return false;
        String userRole = user.getRole().getRoleName();
        for (String r : roles) {
            if (r.equalsIgnoreCase(userRole)) return true;
        }
        return false;
    }

    public void requireRoles(User user, String... roles) {
        if (!hasRole(user, roles)) {
            throw new AccessDeniedException("Your role (" + (user.getRole() != null ? user.getRole().getRoleName() : "NONE") + ") is not authorized for this operation");
        }
    }

    public Optional<Vendor> getVendorForUser(User user) {
        Optional<Vendor> byUserId = vendorRepository.findByVendorUser_UserId(user.getUserId());
        if (byUserId.isPresent()) return byUserId;
        return vendorRepository.findByEmailIgnoreCase(user.getEmail());
    }

    public void enforceVendorAccess(User user, Long targetVendorId) {
        if (hasRole(user, "VENDOR")) {
            Vendor myVendor = getVendorForUser(user)
                    .orElseThrow(() -> new AccessDeniedException("No vendor profile is linked to this vendor account"));
            if (!myVendor.getVendorId().equals(targetVendorId)) {
                throw new AccessDeniedException("Vendor users can only access their own vendor records");
            }
        }
    }

    public UserDto toUserDto(User user) {
        Optional<Vendor> linkedVendor = getVendorForUser(user);
        return UserDto.builder()
                .userId(user.getUserId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .roleId(user.getRole() != null ? user.getRole().getRoleId() : null)
                .roleName(user.getRole() != null ? user.getRole().getRoleName() : null)
                .status(user.getStatus())
                .vendorId(linkedVendor.map(Vendor::getVendorId).orElse(null))
                .vendorCompanyName(linkedVendor.map(Vendor::getCompanyName).orElse(null))
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
